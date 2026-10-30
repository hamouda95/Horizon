import {Component,type ReactNode} from 'react';
export default class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="auth" role="alert"><div className="authbox"><h1>Impossible d’afficher cette page.</h1><p>Rechargez Horizon pour retrouver les données enregistrées. Une saisie non enregistrée devra être reprise.</p><button className="primary" onClick={()=>window.location.reload()}>Recharger Horizon</button></div></div>:this.props.children}
}
