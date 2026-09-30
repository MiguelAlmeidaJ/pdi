'use client';

import { ChangeEvent,useEffect,useState } from 'react';
import { FiImage,FiRefreshCw,FiSave,FiUploadCloud,FiX } from 'react-icons/fi';
import { AppLayout } from '../../../components/app-layout';
import { api } from '../../../lib/api';
import { refreshVisualIdentity,type VisualIdentity } from '../../../lib/visual-identity';

type AssetKey='logoLight'|'logoDark'|'iconLight'|'iconDark';

const assetMeta:Record<AssetKey,{title:string;description:string;surface:'light'|'dark';compact?:boolean}>={
  logoLight:{title:'Logo para fundo claro',description:'Usada em superfícies brancas e claras.',surface:'light'},
  logoDark:{title:'Logo para fundo escuro',description:'Usada no login e outras áreas escuras.',surface:'dark'},
  iconLight:{title:'Ícone para fundo claro',description:'Favicon e usos compactos sobre fundo claro.',surface:'light',compact:true},
  iconDark:{title:'Ícone para fundo escuro',description:'Sidebar recolhido e usos compactos escuros.',surface:'dark',compact:true},
};

export default function IdentidadeVisual(){
  const [form,setForm]=useState<VisualIdentity>({
    id:'default',
    appName:'Trilha',
    tagline:'Evolução profissional com clareza.',
    logoLight:null,
    logoDark:null,
    iconLight:null,
    iconDark:null,
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  useEffect(()=>{
    api<VisualIdentity>('/branding/visual-identity')
      .then(data=>{setForm(data);setError('')})
      .catch(e=>setError(e instanceof Error?e.message:'Erro ao carregar identidade visual'))
      .finally(()=>setLoading(false));
  },[]);

  function readImage(key:AssetKey,event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;

    const allowed=['image/png','image/jpeg','image/webp'];
    if(!allowed.includes(file.type)){
      setError('Use arquivos PNG, JPG ou WEBP.');
      return;
    }
    if(file.size>1024*1024){
      setError('Cada imagem deve ter no máximo 1 MB.');
      return;
    }

    const reader=new FileReader();
    reader.onload=()=>{
      if(typeof reader.result==='string'){
        setForm(current=>({...current,[key]:reader.result as string}));
        setError('');
        setSuccess('');
      }
    };
    reader.readAsDataURL(file);
  }

  function removeImage(key:AssetKey){
    setForm(current=>({...current,[key]:null}));
    setSuccess('');
  }

  async function save(){
    setSaving(true);setError('');setSuccess('');
    try{
      const result=await api<VisualIdentity>('/branding/visual-identity',{
        method:'PUT',
        body:JSON.stringify({
          appName:form.appName,
          tagline:form.tagline,
          logoLight:form.logoLight,
          logoDark:form.logoDark,
          iconLight:form.iconLight,
          iconDark:form.iconDark,
        }),
      });
      setForm(result);
      refreshVisualIdentity(result);
      setSuccess('Identidade visual atualizada com sucesso.');
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao salvar identidade visual');
    }finally{
      setSaving(false);
    }
  }

  if(loading){
    return <AppLayout title="Identidade visual" description="Personalize a marca exibida em toda a Trilha."><div className="skeleton-card"/></AppLayout>;
  }

  return <AppLayout
    title="Identidade visual"
    description="Configure nome, assinatura, logos e ícones usados na aplicação."
    action={<button className="primary-action action-with-icon" onClick={save} disabled={saving}><FiSave/>{saving?'Salvando...':'Salvar alterações'}</button>}
  >
    {error&&<div className="form-error">{error}</div>}
    {success&&<div className="profile-success">{success}</div>}

    <section className="branding-settings-grid">
      <article className="panel branding-copy-card">
        <div className="panel-head"><div><p className="eyebrow">MARCA</p><h2>Nome e assinatura</h2><p className="panel-description">Essas informações aparecem nos pontos principais da interface.</p></div></div>
        <div className="form-grid">
          <label>Nome do produto<input value={form.appName} onChange={e=>setForm({...form,appName:e.target.value})} maxLength={80}/></label>
          <label>Assinatura<textarea value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})} maxLength={160}/></label>
        </div>
      </article>

      <article className="panel branding-guidance-card">
        <div className="branding-guidance-icon"><FiImage/></div>
        <p className="eyebrow">RECOMENDAÇÕES</p>
        <h2>Arquivos da identidade</h2>
        <p>Use PNG, JPG ou WEBP com fundo transparente quando possível. Cada arquivo pode ter até 1 MB.</p>
        <div className="branding-guidance-list">
          <span>Logo: proporção horizontal</span>
          <span>Ícone: formato quadrado</span>
          <span>Versão escura: arte branca</span>
          <span>Versão clara: arte verde/escura</span>
        </div>
      </article>
    </section>

    <section className="branding-assets">
      <div className="branding-assets-head">
        <div><p className="eyebrow">ARQUIVOS</p><h2>Aplicações da marca</h2><p>Defina qual imagem deve ser usada em cada tipo de superfície.</p></div>
      </div>

      <div className="branding-assets-grid">
        {(Object.keys(assetMeta) as AssetKey[]).map(key=>{
          const meta=assetMeta[key];
          const value=form[key];
          return <article className="branding-asset-card" key={key}>
            <div className="branding-asset-copy">
              <strong>{meta.title}</strong>
              <span>{meta.description}</span>
            </div>

            <div className={'branding-preview '+meta.surface+(meta.compact?' compact':'')}>
              {value
                ? <img src={value} alt={meta.title}/>
                : <div className="branding-preview-empty"><FiImage/><span>Nenhuma imagem</span></div>}
            </div>

            <div className="branding-asset-actions">
              <label className="secondary-button action-with-icon branding-upload">
                <FiUploadCloud/>
                {value?'Substituir':'Selecionar imagem'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>readImage(key,event)}/>
              </label>
              {value&&<button className="icon-action-button danger" onClick={()=>removeImage(key)} title="Remover imagem"><FiX/></button>}
            </div>
          </article>
        })}
      </div>
    </section>

    <section className="panel branding-live-preview">
      <div className="panel-head"><div><p className="eyebrow">PRÉVIA</p><h2>Sidebar escuro</h2><p className="panel-description">Visual aproximado de como a marca será apresentada no menu.</p></div></div>
      <div className="branding-sidebar-preview">
        <div className="branding-sidebar-expanded">
          {form.logoDark?<img src={form.logoDark} alt="Logo escura"/>:<div className="branding-preview-fallback"><b>T</b><span><strong>{form.appName}</strong><small>{form.tagline}</small></span></div>}
        </div>
        <div className="branding-sidebar-collapsed">
          {form.iconDark?<img src={form.iconDark} alt="Ícone escuro"/>:<b>T</b>}
        </div>
      </div>
    </section>
  </AppLayout>
}
