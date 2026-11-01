import ts from 'typescript';
import{uiMessages}from'./ui-messages.ts';
export function localizeJsx(source:string,filename:string){
 if(!filename.endsWith('.tsx')||filename.includes('/.horizon-preview/')||filename.includes('/node_modules/'))return null;
 const file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits:Array<{start:number;end:number;text:string}>=[];
 const known=(s:string)=>Boolean(uiMessages[s.trim()])||s.includes('(€)');
 const add=(node:ts.Node,text:string)=>edits.push({start:node.getStart(file),end:node.end,text});
 const literal=(expr:ts.Expression)=>{if(ts.isStringLiteral(expr)&&known(expr.text))add(expr,`__horizonUi(${JSON.stringify(expr.text)})`);else if(ts.isConditionalExpression(expr)){literal(expr.whenTrue);literal(expr.whenFalse)}else if(ts.isBinaryExpression(expr)&&expr.operatorToken.kind===ts.SyntaxKind.PlusToken){literal(expr.left);literal(expr.right)}else if(ts.isParenthesizedExpression(expr))literal(expr.expression);else if(ts.isCallExpression(expr)&&expr.expression.getText(file)==='displayText'&&expr.arguments[0])literal(expr.arguments[0])};
 const attributes=new Set(['title','description','placeholder','aria-label','label','hint']);
 const walk=(node:ts.Node)=>{
  if(ts.isJsxText(node)){const text=node.text.replace(/\s+/g,' ');if(known(text))add(node,`{__horizonUi(${JSON.stringify(text)})}`);return}
  if(ts.isJsxAttribute(node)){
   if(/^on[A-Z]/.test(node.name.getText(file)))return;
   if(attributes.has(node.name.getText(file))&&node.initializer){if(ts.isStringLiteral(node.initializer)&&known(node.initializer.text)){add(node.initializer,`{__horizonUi(${JSON.stringify(node.initializer.text)})}`);return}if(ts.isJsxExpression(node.initializer)&&node.initializer.expression)literal(node.initializer.expression)}
   // Nested JSX in action/settings props still needs localization.
   if(node.initializer)ts.forEachChild(node.initializer,child=>{if(ts.isJsxElement(child)||ts.isJsxSelfClosingElement(child)||ts.isJsxFragment(child))walk(child)});return;
  }
  if(ts.isJsxExpression(node)&&node.expression)literal(node.expression);
  ts.forEachChild(node,walk);
 };
 walk(file);if(!edits.length)return null;
 let result=source;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
 return "import {translateUi as __horizonUi} from '/src/lib/i18n.ts';\n"+result;
}
export function uiLocalizationPlugin(){return{name:'horizon-ui-localization',enforce:'pre' as const,transform(code:string,id:string){const result=localizeJsx(code,id.split('?')[0]);return result?{code:result,map:null}:null}}}
