'use strict';

const CONFIG = {
  API_URL: 'COLE_AQUI_A_URL_DO_APP_DA_WEB',
  FOTO_LADOS: [960, 720],
  FOTO_QUALIDADES: [0.86, 0.78, 0.7, 0.62, 0.55],
  TIMEOUT_MS: 45000
};

const PASSOS = ['login', 'endereco', 'telefones', 'uniforme', 'selfie', 'revisao'];
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const NAO_USA = 'NAO_USA';
const RE_CEL = /^[1-9][1-9]9\d{8}$/;
const RE_TEL = /^[1-9][1-9](9\d{8}|[2-5]\d{7})$/;
const ROTULO_STATUS = { PENDENTE: 'Pendente', EM_ANALISE: 'Em análise', APROVADA: 'Aprovada', DEVOLVIDA_PARA_CORRECAO: 'Devolvida para correção' };
const TRANSICOES = {
  PENDENTE: ['EM_ANALISE', 'APROVADA', 'DEVOLVIDA_PARA_CORRECAO'],
  EM_ANALISE: ['APROVADA', 'DEVOLVIDA_PARA_CORRECAO', 'PENDENTE'],
  APROVADA: [],
  DEVOLVIDA_PARA_CORRECAO: []
};
const CAMPOS = {
  cep: 'f-cep', logradouro: 'f-logradouro', numero: 'f-numero', complemento: 'f-complemento', bairro: 'f-bairro',
  cidade: 'f-cidade', uf: 'f-uf', referencia: 'f-referencia', telPrincipal: 'f-tel1', telAlternativo: 'f-tel2',
  contatoEmergencia: 'f-contato', telEmergencia: 'f-tel3'
};
const ROTULOS = [
  ['cep', 'CEP'], ['logradouro', 'Rua/avenida'], ['numero', 'Número'], ['complemento', 'Complemento'], ['bairro', 'Bairro'],
  ['cidade', 'Cidade'], ['uf', 'UF'], ['referencia', 'Ponto de referência'], ['telPrincipal', 'Celular principal'],
  ['telAlternativo', 'Telefone alternativo'], ['contatoEmergencia', 'Contato de emergência'], ['telEmergencia', 'Telefone de emergência']
];

const S = {
  config: null, token: null, func: null, passo: 'login', dados: novosDados(),
  foto: null, manterFoto: false, requestId: null, enviando: false, sujo: false, retomar: null, stream: null
};
const A = { token: null, usuario: null, perms: [], filtros: {}, statusAtivo: '' };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const so = v => String(v == null ? '' : v).replace(/\D/g, '');

function novosDados() {
  return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', referencia: '',
    telPrincipal: '', telAlternativo: '', contatoEmergencia: '', telEmergencia: '', uniforme: {} };
}

function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') n.className = v;
    else n.setAttribute(k, v === true ? '' : v);
  });
  n.append(...filhos.filter(f => f != null && f !== false));
  return n;
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ---------- API ---------- */

function erroApp(code, msg) { const e = new Error(msg); e.code = code; return e; }

async function api(action, payload = {}) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(CONFIG.API_URL)) {
    throw erroApp('CONFIG', 'O sistema ainda não foi configurado. Avise o Departamento Pessoal.');
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);
  let res;
  try {
    res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: ctrl.signal
    });
  } catch (e) {
    throw erroApp('REDE', e.name === 'AbortError'
      ? 'O servidor demorou para responder. Verifique sua internet e tente de novo.'
      : 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  } finally {
    clearTimeout(t);
  }
  let j;
  try { j = await res.json(); } catch (_) { throw erroApp('RESPOSTA', 'Resposta inesperada do servidor. Tente de novo em instantes.'); }
  if (!j.ok) throw erroApp(j.code, j.msg);
  return j.data;
}

/* ---------- Interface comum ---------- */

function carregando(txt) { $('#carregando-txt').textContent = txt || 'Carregando…'; $('#carregando').hidden = false; }
function fimCarregando() { $('#carregando').hidden = true; }

let toastTimer;
function toast(msg, tipo = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (tipo === 'erro' ? ' erro-t' : tipo === 'ok' ? ' ok-t' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 5200);
}

function mostrarMsg(alvo, texto, tipo) {
  alvo.className = 'msg' + (texto ? ' msg-' + (tipo || 'erro') : '');
  alvo.textContent = texto || '';
}

function confirmar(texto, ok = 'Confirmar') {
  const d = $('#dlg-confirmar');
  $('#conf-texto').textContent = texto;
  $('#conf-ok').textContent = ok;
  d.returnValue = 'nao';
  d.showModal();
  return new Promise(r => d.addEventListener('close', () => r(d.returnValue === 'sim'), { once: true }));
}

function marcarErro(id, msg) {
  const campo = document.getElementById(id);
  const erro = document.getElementById('e-' + id);
  if (campo) {
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (erro) campo.setAttribute('aria-describedby', 'e-' + id);
  }
  if (erro) erro.textContent = msg || '';
  return !msg;
}

function focarPrimeiroErro(container) {
  const alvo = $('[aria-invalid="true"], .peca.invalido input', container);
  if (alvo) alvo.focus();
}

const mascaraCep = v => { const d = so(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
function mascaraTel(v) {
  const d = so(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function fmtData(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (s || '');
}
const fmtTam = v => v === NAO_USA ? 'Não usa' : (v || '');

/* ---------- Fluxo do funcionário ---------- */

function irPara(passo) {
  if (passo === 'revisao') {
    const pendente = ['endereco', 'telefones', 'uniforme', 'selfie'].find(p => !VALIDADORES[p]());
    if (pendente) { passo = pendente; toast('Complete esta etapa antes de revisar.', 'erro'); }
  }
  S.passo = passo;
  $$('#app-func .etapa').forEach(s => { s.hidden = s.dataset.etapa !== passo; });
  const i = PASSOS.indexOf(passo);
  const fim = passo === 'protocolo';
  const semTrilha = passo === 'status' || passo === 'inicio';
  $('#trilha').hidden = semTrilha;
  $('.trilho').hidden = semTrilha;
  $$('#trilha li').forEach((li, j) => {
    li.classList.toggle('feito', fim || j < i);
    if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('#trilho-barra').style.width = (fim ? 100 : Math.max(0, i) / (PASSOS.length - 1) * 100) + '%';
  const navegavel = ['endereco', 'telefones', 'uniforme', 'selfie', 'revisao'].includes(passo);
  $('#nav').hidden = !navegavel;
  $('#btn-voltar').hidden = passo === 'endereco';
  $('#btn-continuar').hidden = passo === 'revisao';
  if (passo === 'selfie') atualizarSelfie();
  if (passo === 'revisao') montarResumo();
  if (!['login', 'status', 'inicio'].includes(passo)) $('#aviso-devolucao').hidden = !S.avisoDevolucao || fim;
  const h = $(`.etapa[data-etapa="${passo}"] h2`);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (S.iniciado) $('#app-func').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
  S.iniciado = true;
  if (h) setTimeout(() => h.focus({ preventScroll: true }), 50);
}

const VALIDADORES = { endereco: validarEndereco, telefones: validarTelefones, uniforme: validarUniforme, selfie: validarSelfie };

function continuar() {
  const v = VALIDADORES[S.passo];
  if (v && !v()) return;
  irPara(PASSOS[PASSOS.indexOf(S.passo) + 1]);
}
function voltar() {
  const i = PASSOS.indexOf(S.passo);
  if (i > 1) { lerCampos(); irPara(PASSOS[i - 1]); }
}

function lerCampos() {
  Object.entries(CAMPOS).forEach(([k, id]) => {
    const v = document.getElementById(id).value.trim();
    S.dados[k] = ['cep', 'telPrincipal', 'telAlternativo', 'telEmergencia'].includes(k) ? so(v) : v;
  });
}

function preencherCampos() {
  Object.entries(CAMPOS).forEach(([k, id]) => {
    const v = S.dados[k] || '';
    document.getElementById(id).value = k === 'cep' ? mascaraCep(v) : k.startsWith('tel') ? mascaraTel(v) : v;
  });
  if (S.config) montarUniforme();
}

function validarEndereco() {
  lerCampos();
  const d = S.dados;
  [
    marcarErro('f-cep', d.cep.length === 8 ? '' : 'Informe os 8 números do CEP.'),
    marcarErro('f-logradouro', d.logradouro.length >= 3 ? '' : 'Informe a rua ou avenida.'),
    marcarErro('f-numero', /^[0-9a-z\/\- ]{1,10}$/i.test(d.numero) ? '' : 'Informe o número da casa ou S/N.'),
    marcarErro('f-bairro', d.bairro.length >= 2 ? '' : 'Informe o bairro.'),
    marcarErro('f-cidade', d.cidade.length >= 2 ? '' : 'Informe a cidade.'),
    marcarErro('f-uf', UFS.includes(d.uf) ? '' : 'Selecione o estado.')
  ];
  focarPrimeiroErro($('[data-etapa="endereco"]'));
  return !$('[data-etapa="endereco"] [aria-invalid="true"]');
}

function validarTelefones() {
  lerCampos();
  const d = S.dados;
  marcarErro('f-tel1', RE_CEL.test(d.telPrincipal) ? '' : 'Informe um celular com DDD, por exemplo (24) 99999-9999.');
  marcarErro('f-tel2', !d.telAlternativo || RE_TEL.test(d.telAlternativo) ? '' : 'Número inválido. Confira o DDD e os dígitos.');
  marcarErro('f-tel3', !d.telEmergencia || RE_TEL.test(d.telEmergencia) ? (d.contatoEmergencia && !d.telEmergencia ? 'Informe o telefone do contato.' : '') : 'Número inválido. Confira o DDD e os dígitos.');
  marcarErro('f-contato', d.telEmergencia && d.contatoEmergencia.length < 2 ? 'Informe o nome do contato.' : '');
  focarPrimeiroErro($('[data-etapa="telefones"]'));
  return !$('[data-etapa="telefones"] [aria-invalid="true"]');
}

function validarUniforme() {
  let ok = true;
  (S.config ? S.config.pecas : []).forEach(p => {
    const fs = document.getElementById('p-' + p.chave);
    const v = S.dados.uniforme[p.chave];
    const valido = p.opcoes.includes(v) || (!p.obrigatoria && v === NAO_USA);
    fs.classList.toggle('invalido', !valido);
    $('.erro', fs).textContent = valido ? '' : (p.obrigatoria ? 'Escolha o seu tamanho.' : 'Escolha o tamanho ou marque "Não uso".');
    if (!valido) ok = false;
  });
  if (!ok) focarPrimeiroErro($('[data-etapa="uniforme"]'));
  return ok;
}

function validarSelfie() {
  const temAnterior = !!(S.func && S.func.ultima && S.func.ultima.temFoto);
  const ok = !!S.foto || (S.manterFoto && temAnterior) || (S.config && !S.config.fotoObrigatoria);
  $('#e-selfie').textContent = ok ? '' : (temAnterior ? 'Tire uma selfie nova ou marque a opção de manter a foto atual.' : 'Tire uma selfie para continuar.');
  return ok;
}

function montarUniforme() {
  const box = $('#lista-pecas');
  box.replaceChildren();
  S.config.pecas.forEach(p => {
    const erro = el('p', { class: 'erro', id: 'e-p-' + p.chave });
    const fs = el('fieldset', { class: 'peca', id: 'p-' + p.chave, 'aria-describedby': 'e-p-' + p.chave });
    const legenda = el('legend', {}, p.peca, p.obrigatoria ? null : el('span', { class: 'opcional' }, ' (se usar)'));
    const grupo = el('div', { class: 'chips' });
    const opcoes = p.opcoes.map(o => [o, o]).concat(p.obrigatoria ? [] : [[NAO_USA, 'Não uso']]);
    opcoes.forEach(([valor, texto]) => {
      const inp = el('input', { type: 'radio', name: 'u-' + p.chave, value: valor });
      inp.checked = S.dados.uniforme[p.chave] === valor;
      inp.addEventListener('change', () => {
        S.dados.uniforme[p.chave] = valor;
        S.sujo = true;
        fs.classList.remove('invalido');
        erro.textContent = '';
      });
      grupo.append(el('label', { class: 'chip' + (valor === NAO_USA ? ' chip-nao' : '') }, inp, el('span', {}, texto)));
    });
    fs.append(legenda, grupo, erro);
    box.append(fs);
  });
}

/* ---------- CEP ---------- */

let cepUltimo = '';
async function buscarCep() {
  const cep = so($('#f-cep').value);
  if (cep.length !== 8 || cep === cepUltimo) return;
  cepUltimo = cep;
  const st = $('#cep-status');
  st.textContent = 'Buscando endereço…';
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const j = await r.json();
    if (j.erro) throw new Error('nao encontrado');
    if (j.logradouro) $('#f-logradouro').value = j.logradouro;
    if (j.bairro) $('#f-bairro').value = j.bairro;
    if (j.localidade) $('#f-cidade').value = j.localidade;
    if (j.uf) $('#f-uf').value = j.uf;
    ['f-cep', 'f-logradouro', 'f-bairro', 'f-cidade', 'f-uf'].forEach(id => marcarErro(id, ''));
    st.textContent = 'Endereço encontrado. Confira e informe o número.';
    $('#f-numero').focus();
  } catch (_) {
    st.textContent = 'Não encontramos esse CEP. Preencha o endereço manualmente.';
  }
}

/* ---------- Selfie ---------- */

async function abrirCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#f-camera').click(); return; }
  try {
    S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
  } catch (err) {
    if (err.name === 'NotAllowedError') toast('A câmera foi bloqueada. Libere a permissão no navegador ou use "Escolher foto do aparelho".', 'erro');
    else toast('Não foi possível abrir a câmera. Use "Escolher foto do aparelho".', 'erro');
    return;
  }
  const v = $('#camera-video');
  v.srcObject = S.stream;
  $('#dlg-camera').showModal();
  try { await v.play(); } catch (_) { }
}

function pararCamera() {
  if (S.stream) S.stream.getTracks().forEach(t => t.stop());
  S.stream = null;
  $('#camera-video').srcObject = null;
}

async function capturar() {
  const v = $('#camera-video');
  if (!v.videoWidth) return toast('A câmera ainda está iniciando. Tente de novo.', 'erro');
  try {
    await definirFoto(v);
    $('#dlg-camera').close();
  } catch (e) {
    toast(e.message || 'Não foi possível capturar a foto.', 'erro');
  }
}

async function escolherArquivo(e) {
  const arq = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  if (arq.type && !arq.type.startsWith('image/')) return toast('Escolha um arquivo de imagem.', 'erro');
  carregando('Preparando a foto…');
  const url = URL.createObjectURL(arq);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    await definirFoto(img);
  } catch (err) {
    toast(err.code ? err.message : 'Não foi possível ler essa imagem. Tente outra foto.', 'erro');
  } finally {
    URL.revokeObjectURL(url);
    fimCarregando();
  }
}

async function comprimir(fonte, max) {
  const w0 = fonte.videoWidth || fonte.naturalWidth;
  const h0 = fonte.videoHeight || fonte.naturalHeight;
  if (!w0 || !h0) throw erroApp('FOTO', 'Imagem inválida.');
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  for (const lado of CONFIG.FOTO_LADOS) {
    const esc = Math.min(1, lado / Math.max(w0, h0));
    c.width = Math.round(w0 * esc);
    c.height = Math.round(h0 * esc);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(fonte, 0, 0, c.width, c.height);
    for (const q of CONFIG.FOTO_QUALIDADES) {
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
      if (b && b.size <= max) return b;
    }
  }
  throw erroApp('FOTO_GRANDE', 'A foto ficou grande demais. Tente outra.');
}

async function definirFoto(fonte) {
  const max = Math.floor(((S.config && S.config.fotoMaxBytes) || 700 * 1024) * 0.95);
  const blob = await comprimir(fonte, max);
  if (S.foto) URL.revokeObjectURL(S.foto.url);
  S.foto = { blob, url: URL.createObjectURL(blob) };
  S.manterFoto = false;
  S.sujo = true;
  atualizarSelfie();
}

function atualizarSelfie() {
  const img = $('#selfie-preview');
  const temAnterior = !!(S.func && S.func.ultima && S.func.ultima.temFoto);
  img.hidden = !S.foto;
  $('#selfie-vazia').hidden = !!S.foto;
  $('#selfie-moldura').classList.toggle('com-foto', !!S.foto);
  if (S.foto) img.src = S.foto.url; else img.removeAttribute('src');
  $('#txt-camera').textContent = S.foto ? 'Tirar outra' : 'Tirar selfie';
  $('#btn-remover-foto').hidden = !S.foto;
  $('#opcao-manter').hidden = !temAnterior;
  $('#f-manter-foto').checked = S.manterFoto;
  $('#selfie-info').textContent = S.foto
    ? `Foto pronta (${Math.round(S.foto.blob.size / 1024)} KB).`
    : S.manterFoto ? 'A foto atual do cadastro será mantida.' : '';
  if (S.foto || S.manterFoto) $('#e-selfie').textContent = '';
}

function blobParaBase64(blob) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = () => falha(new Error('leitura'));
    r.readAsDataURL(blob);
  });
}

/* ---------- Revisão e envio ---------- */

function montarResumo() {
  const d = S.dados;
  const box = $('#resumo');
  box.replaceChildren();
  const bloco = (titulo, passo, linhas, extra) => {
    const alterar = el('button', { type: 'button', class: 'btn-link' }, 'Alterar');
    alterar.addEventListener('click', () => irPara(passo));
    const dl = el('dl', { class: 'dados-lista' });
    linhas.forEach(([k, v]) => dl.append(el('dt', {}, k), el('dd', {}, v || '—')));
    box.append(el('section', { class: 'resumo-bloco' },
      el('div', { class: 'resumo-cab' }, el('h3', {}, titulo), alterar), linhas.length ? dl : null, extra || null));
  };
  bloco('Endereço', 'endereco', [
    ['CEP', mascaraCep(d.cep)],
    ['Endereço', `${d.logradouro}, ${d.numero}${d.complemento ? ' – ' + d.complemento : ''}`],
    ['Bairro', d.bairro],
    ['Cidade', `${d.cidade} / ${d.uf}`],
    ['Referência', d.referencia]
  ]);
  bloco('Telefones', 'telefones', [
    ['Celular principal', mascaraTel(d.telPrincipal)],
    ['Alternativo', mascaraTel(d.telAlternativo)],
    ['Emergência', d.contatoEmergencia ? `${d.contatoEmergencia} – ${mascaraTel(d.telEmergencia)}` : '']
  ]);
  bloco('Uniforme', 'uniforme', S.config.pecas.map(p => [p.peca, fmtTam(d.uniforme[p.chave])]));
  const foto = S.foto
    ? el('img', { class: 'resumo-foto', src: S.foto.url, alt: 'Selfie que será enviada' })
    : el('p', { class: 'guia' }, S.manterFoto ? 'Será mantida a foto que já está no cadastro.' : 'Nenhuma foto.');
  bloco('Selfie', 'selfie', [], foto);
  $('#f-declaro').checked = false;
  $('#e-declaro').textContent = '';
  mostrarMsg($('#envio-msg'), '');
}

async function enviar() {
  if (S.enviando) return;
  if (!$('#f-declaro').checked) {
    $('#e-declaro').textContent = 'Marque a declaração para enviar.';
    $('#f-declaro').focus();
    return;
  }
  S.enviando = true;
  $('#btn-enviar').disabled = true;
  carregando('Enviando sua atualização…');
  try {
    const foto = S.foto ? { mime: 'image/jpeg', base64: await blobParaBase64(S.foto.blob) } : null;
    const r = await api('enviar', {
      token: S.token, requestId: S.requestId, dados: S.dados, foto, manterFotoAtual: !S.foto && S.manterFoto
    });
    S.sujo = false;
    S.avisoDevolucao = false;
    $('#aviso-devolucao').hidden = true;
    $('#c-protocolo').textContent = r.protocolo;
    $('#c-data').textContent = r.dataHora;
    $('#c-nome').textContent = S.func.nome;
    $('#c-mat').textContent = S.func.matricula;
    irPara('protocolo');
  } catch (err) {
    tratarErroFunc(err, $('#envio-msg'));
  } finally {
    S.enviando = false;
    $('#btn-enviar').disabled = false;
    fimCarregando();
  }
}

/* ---------- Sessão do funcionário ---------- */

async function entrar(e) {
  e.preventDefault();
  const mat = $('#l-matricula').value.trim();
  const cod = $('#l-codigo').value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const okM = marcarErro('l-matricula', mat ? '' : 'Informe sua matrícula.');
  const okC = marcarErro('l-codigo', cod.length >= 6 ? '' : 'Informe o código de acesso.');
  if (!okM || !okC) return focarPrimeiroErro($('#form-login'));
  mostrarMsg($('#login-msg'), '');
  carregando('Validando seu acesso…');
  try {
    if (!S.config) S.config = await api('config');
    const r = await api('login', { matricula: mat, codigo: cod });
    const mesmo = !!(S.func && S.func.id === r.id);
    S.token = r.token;
    S.func = r;
    $('#l-codigo').value = '';
    $('#sessao-nome').textContent = r.nome;
    $('#sessao-mat').textContent = 'Matrícula ' + r.matricula;
    $('#sessao').hidden = false;

    if (r.bloqueada) { mostrarStatus(r.ultima); return irPara('status'); }

    if (!mesmo) {
      S.dados = novosDados();
      if (S.foto) URL.revokeObjectURL(S.foto.url);
      S.foto = null;
      S.manterFoto = false;
      S.requestId = uuid();
      S.sujo = false;
      aplicarUltima(r.ultima);
      preencherCampos();
    }
    const destino = mesmo && S.retomar ? S.retomar : (S.destino || 'endereco');
    S.retomar = null;
    S.destino = null;
    irPara(destino);
  } catch (err) {
    mostrarMsg($('#login-msg'), err.message, err.code === 'BLOQUEADO' || err.code === 'CODIGO_EXPIRADO' ? 'alerta' : 'erro');
  } finally {
    fimCarregando();
  }
}

function aplicarUltima(u) {
  S.avisoDevolucao = false;
  const aviso = $('#aviso-devolucao');
  aviso.hidden = true;
  if (!u) return;
  const base = novosDados();
  Object.keys(base).forEach(k => { if (k !== 'uniforme' && u.dados[k] != null) base[k] = u.dados[k]; });
  base.uniforme = Object.assign({}, u.dados.uniforme || {});
  S.dados = base;
  if (u.status === 'DEVOLVIDA_PARA_CORRECAO') {
    S.avisoDevolucao = true;
    aviso.replaceChildren(
      el('strong', {}, 'O Departamento Pessoal pediu uma correção. '),
      `Protocolo ${u.protocolo}: ${u.observacaoRh || 'confira seus dados e envie de novo.'}`
    );
  }
}

function mostrarStatus(u) {
  const dl = $('#status-dados');
  dl.replaceChildren(
    el('dt', {}, 'Protocolo'), el('dd', {}, u.protocolo),
    el('dt', {}, 'Enviado em'), el('dd', {}, fmtData(u.dataEnvio)),
    el('dt', {}, 'Situação'), el('dd', {}, ROTULO_STATUS[u.status] || u.status)
  );
}

function tratarErroFunc(err, alvo) {
  if (err.code === 'SESSAO_EXPIRADA') {
    S.retomar = S.passo;
    S.token = null;
    irPara('login');
    mostrarMsg($('#login-msg'), 'Sua sessão expirou por inatividade. Entre de novo para continuar de onde parou. Nada do que você preencheu foi perdido.', 'alerta');
    return;
  }
  if (alvo) mostrarMsg(alvo, err.message, 'erro'); else toast(err.message, 'erro');
}

async function sair(perguntar = true) {
  if (perguntar && S.sujo && !(await confirmar('Você ainda não enviou a atualização. Se sair agora, o que foi preenchido será descartado.', 'Sair e descartar'))) return;
  if (S.token) api('sair', { token: S.token }).catch(() => { });
  if (S.foto) URL.revokeObjectURL(S.foto.url);
  Object.assign(S, { token: null, func: null, dados: novosDados(), foto: null, manterFoto: false, requestId: null, sujo: false, retomar: null, avisoDevolucao: false });
  $('#sessao').hidden = true;
  $('#aviso-devolucao').hidden = true;
  $('#form-login').reset();
  preencherCampos();
  mostrarMsg($('#login-msg'), '');
  irPara('inicio');
}

function comecar(passo) {
  S.destino = passo;
  if (S.token) { S.destino = null; irPara(passo); } else irPara('login');
}

/* ---------- Painel do RH ---------- */

const pode = p => A.perms.includes(p);

function rota() {
  const rh = location.hash === '#rh';
  $('#app-func').hidden = rh;
  $('#app-rh').hidden = !rh;
  $('#sessao').hidden = rh || !S.token;
  document.body.classList.toggle('modo-rh', rh);
  document.title = rh ? 'Departamento Pessoal | Atualização Cadastral Vegas' : 'Atualização Cadastral | Vegas Vigilância e Segurança';
}

async function entrarRh(e) {
  e.preventDefault();
  const usuario = $('#rh-usuario-in').value.trim();
  const senha = $('#rh-senha-in').value;
  if (!usuario || !senha) return mostrarMsg($('#rh-login-msg'), 'Informe usuário e senha.');
  carregando('Entrando…');
  try {
    if (!S.config) S.config = await api('config');
    const r = await api('adminLogin', { usuario, senha });
    A.token = r.token;
    A.usuario = r.usuario;
    A.perms = r.permissoes || [];
    $('#rh-senha-in').value = '';
    mostrarMsg($('#rh-login-msg'), '');
    $('#rh-quem').textContent = `${r.nome || r.usuario} (${r.perfil.toLowerCase()})`;
    $('#rh-login').hidden = true;
    $('#rh-painel').hidden = false;
    $('#rh-exportar').hidden = !pode('exportar');
    $('#rh-codigos').hidden = !pode('codigos');
    await carregarLista();
  } catch (err) {
    mostrarMsg($('#rh-login-msg'), err.message, err.code === 'BLOQUEADO' ? 'alerta' : 'erro');
  } finally {
    fimCarregando();
  }
}

function sairRh(msg) {
  if (A.token) api('sair', { token: A.token }).catch(() => { });
  Object.assign(A, { token: null, usuario: null, perms: [], filtros: {}, statusAtivo: '' });
  $('#rh-painel').hidden = true;
  $('#rh-login').hidden = false;
  $('#rh-tabela tbody').replaceChildren();
  $('#codigo-resultado').hidden = true;
  const d = $('#dlg-detalhe');
  if (d.open) d.close();
  mostrarMsg($('#rh-login-msg'), msg || '', 'alerta');
}

function tratarErroRh(err) {
  if (err.code === 'SESSAO_EXPIRADA') return sairRh('Sua sessão expirou. Entre novamente.');
  toast(err.message, 'erro');
}

function lerFiltros() {
  return {
    texto: $('#rh-busca').value.trim(),
    status: $('#rh-status').value,
    unidade: $('#rh-unidade').value,
    de: $('#rh-de').value,
    ate: $('#rh-ate').value
  };
}

async function carregarLista() {
  A.filtros = lerFiltros();
  carregando('Buscando atualizações…');
  try {
    const r = await api('adminListar', { token: A.token, filtros: A.filtros });
    renderLista(r);
  } catch (err) {
    tratarErroRh(err);
  } finally {
    fimCarregando();
  }
}

const badge = st => el('span', { class: 'badge st-' + st }, ROTULO_STATUS[st] || st);
const celula = (rotulo, conteudo) => el('td', { 'data-rotulo': rotulo }, conteudo);

function renderLista(r) {
  $$('#rh-stats .stat').forEach(b => {
    $('strong', b).textContent = r.stats[b.dataset.status] || 0;
    b.setAttribute('aria-pressed', String(A.filtros.status === b.dataset.status));
  });
  const sel = $('#rh-unidade');
  const atual = sel.value;
  sel.replaceChildren(el('option', { value: '' }, 'Todas'), ...r.unidades.map(u => el('option', { value: u }, u)));
  sel.value = r.unidades.includes(atual) ? atual : '';

  const tb = $('#rh-tabela tbody');
  tb.replaceChildren();
  r.itens.forEach(it => {
    const link = el('button', { type: 'button', class: 'btn-link link-prot' }, it.protocolo);
    link.addEventListener('click', () => abrirDetalhe(it.protocolo));
    tb.append(el('tr', {},
      celula('Protocolo', link), celula('Funcionário', it.nome), celula('Matrícula', it.matricula),
      celula('Unidade', it.unidade || '—'), celula('Enviado em', fmtData(it.dataEnvio)), celula('Situação', badge(it.status))));
  });
  $('#rh-vazio').hidden = r.itens.length > 0;
  $('#rh-total').textContent = r.total > r.itens.length
    ? `Mostrando ${r.itens.length} de ${r.total}. Refine os filtros para ver as demais.`
    : `${r.total} atualização(ões)`;
}

function linhasComparacao(atual, anterior) {
  const fmt = (k, v) => k === 'cep' ? mascaraCep(v) : k.startsWith('tel') ? mascaraTel(v) : (v || '');
  const linhas = ROTULOS.map(([k, rot]) => [rot, anterior ? fmt(k, anterior[k]) : null, fmt(k, atual[k])]);
  const pecas = (S.config ? S.config.pecas : []).map(p => [p.chave, p.peca]);
  const chaves = new Set(pecas.map(p => p[0]));
  Object.keys(Object.assign({}, anterior && anterior.uniforme, atual.uniforme)).forEach(k => { if (!chaves.has(k)) pecas.push([k, k]); });
  pecas.forEach(([k, rot]) => linhas.push(['Tamanho: ' + rot, anterior ? fmtTam((anterior.uniforme || {})[k]) : null, fmtTam((atual.uniforme || {})[k])]));
  return linhas;
}

async function abrirDetalhe(protocolo) {
  carregando('Abrindo atualização…');
  try {
    const r = await api('adminDetalhe', { token: A.token, protocolo });
    renderDetalhe(r);
    const d = $('#dlg-detalhe');
    if (!d.open) d.showModal();
  } catch (err) {
    tratarErroRh(err);
  } finally {
    fimCarregando();
  }
}

function renderDetalhe({ registro: a, anterior: p, historico }) {
  $('#det-titulo').textContent = a.nome;
  const corpo = $('#det-corpo');
  corpo.replaceChildren();

  corpo.append(el('div', { class: 'det-meta' },
    el('span', {}, 'Matrícula ' + a.matricula), el('span', {}, a.protocolo),
    el('span', {}, 'Enviado em ' + fmtData(a.dataEnvio)), a.unidade ? el('span', {}, a.unidade) : null, badge(a.status)));

  if (a.observacaoRh) {
    corpo.append(el('div', { class: 'aviso aviso-alerta' }, el('strong', {}, 'Observação do RH: '), a.observacaoRh,
      a.analisadoPor ? ` (${a.analisadoPor}, ${fmtData(a.dataAnalise)})` : ''));
  }

  const tabela = el('table', { class: 'comparacao' },
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col' }, 'Campo'),
      el('th', { scope: 'col' }, p ? `Anterior (${fmtData(p.dataEnvio).slice(0, 10)})` : 'Anterior'),
      el('th', { scope: 'col' }, 'Enviado agora'))));
  const tb = el('tbody');
  linhasComparacao(a.dados, p && p.dados).forEach(([rot, ant, novo]) => {
    const mudou = ant !== null && ant !== novo;
    tb.append(el('tr', { class: mudou ? 'mudou' : null },
      el('td', {}, rot), el('td', { class: 'ant' }, ant === null ? '—' : (ant || '—')), el('td', {}, novo || '—')));
  });
  tabela.append(tb);
  const legenda = p ? el('p', { class: 'dica' }, 'Linhas destacadas mudaram em relação ao envio anterior.') : el('p', { class: 'dica' }, 'Primeiro envio deste funcionário: não há dados anteriores para comparar.');

  const moldura = el('div', { class: 'selfie-moldura' }, el('span', { class: 'dica' }, a.temFoto ? 'Foto protegida' : 'Sem foto'));
  const fotoBox = el('div', { class: 'det-foto' }, moldura);
  if (a.temFoto && pode('foto')) {
    const ver = el('button', { type: 'button', class: 'btn' }, 'Ver selfie');
    ver.addEventListener('click', async () => {
      ver.disabled = true;
      try {
        const f = await api('adminFoto', { token: A.token, protocolo: a.protocolo });
        moldura.replaceChildren(el('img', { src: f.dataUrl, alt: 'Selfie enviada por ' + a.nome }));
        moldura.classList.add('com-foto');
        ver.remove();
      } catch (err) {
        ver.disabled = false;
        tratarErroRh(err);
      }
    });
    fotoBox.append(ver);
  }

  corpo.append(el('div', { class: 'det-grade' }, el('div', {}, tabela, legenda), fotoBox));

  const acoes = montarAcoes(a);
  if (acoes) corpo.append(el('section', { class: 'det-secao' }, el('h3', {}, 'Análise'), acoes));

  const lista = el('ul', { class: 'historico' });
  historico.forEach(h => lista.append(el('li', {},
    el('small', {}, `${fmtData(h.dataHora)} · ${h.responsavel || 'sistema'}`),
    descreverAcao(h.acao), h.observacao ? ` – ${h.observacao}` : '')));
  if (!historico.length) lista.append(el('li', {}, 'Sem movimentações registradas.'));
  corpo.append(el('section', { class: 'det-secao' }, el('h3', {}, 'Histórico'), lista));
}

function descreverAcao(acao) {
  const mapa = {
    ATUALIZACAO_ENVIADA: 'Atualização enviada pelo funcionário', CORRECAO_ENVIADA: 'Correção enviada pelo funcionário',
    STATUS_EM_ANALISE: 'Análise iniciada', STATUS_APROVADA: 'Atualização aprovada', STATUS_PENDENTE: 'Voltou para pendente',
    STATUS_DEVOLVIDA_PARA_CORRECAO: 'Devolvida para correção', FOTO_VISUALIZADA: 'Selfie visualizada'
  };
  return mapa[acao] || acao;
}

function montarAcoes(a) {
  if (!pode('analisar')) return null;
  const possiveis = TRANSICOES[a.status] || [];
  if (!possiveis.length) return null;
  const box = el('div', { class: 'det-acoes' });
  const botoes = el('div', { class: 'linha-botoes' });
  const botao = (txt, status, metal) => {
    const b = el('button', { type: 'button', class: 'btn' + (metal ? ' btn-metal' : '') }, txt);
    b.addEventListener('click', () => mudarStatus(a, status));
    botoes.append(b);
  };
  if (possiveis.includes('EM_ANALISE')) botao('Iniciar análise', 'EM_ANALISE');
  if (possiveis.includes('PENDENTE')) botao('Voltar para pendente', 'PENDENTE');
  if (possiveis.includes('APROVADA')) botao('Aprovar atualização', 'APROVADA', true);
  box.append(botoes);
  if (possiveis.includes('DEVOLVIDA_PARA_CORRECAO')) {
    const id = 'obs-' + a.protocolo;
    const txt = el('textarea', { id, maxlength: '500', placeholder: 'Ex.: a selfie está escura; tire outra com o rosto bem iluminado.' });
    const dev = el('button', { type: 'button', class: 'btn' }, 'Devolver para correção');
    dev.addEventListener('click', () => mudarStatus(a, 'DEVOLVIDA_PARA_CORRECAO', txt));
    box.append(el('div', { class: 'campo' }, el('label', { for: id }, 'O que o funcionário precisa corrigir'), txt), el('div', {}, dev));
  }
  return box;
}

async function mudarStatus(a, status, campoObs) {
  const obs = campoObs ? campoObs.value.trim() : '';
  if (status === 'DEVOLVIDA_PARA_CORRECAO' && obs.length < 5) {
    campoObs.setAttribute('aria-invalid', 'true');
    campoObs.focus();
    return toast('Explique o que precisa ser corrigido.', 'erro');
  }
  if (status === 'APROVADA' && !(await confirmar(`Aprovar a atualização ${a.protocolo} de ${a.nome}?`, 'Aprovar'))) return;
  if (status === 'DEVOLVIDA_PARA_CORRECAO' && !(await confirmar(`Devolver a atualização ${a.protocolo} para correção? O funcionário verá a sua observação.`, 'Devolver'))) return;
  carregando('Salvando…');
  try {
    await api('adminStatus', { token: A.token, protocolo: a.protocolo, status, observacao: obs });
    toast('Situação atualizada: ' + ROTULO_STATUS[status] + '.', 'ok');
    const r = await api('adminDetalhe', { token: A.token, protocolo: a.protocolo });
    renderDetalhe(r);
    const l = await api('adminListar', { token: A.token, filtros: A.filtros });
    renderLista(l);
  } catch (err) {
    tratarErroRh(err);
  } finally {
    fimCarregando();
  }
}

async function exportarCsv() {
  carregando('Gerando CSV…');
  try {
    const r = await api('adminExportar', { token: A.token, filtros: A.filtros });
    const esc = c => {
      let s = String(c == null ? '' : c);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '\ufeff' + [r.cabecalho, ...r.linhas].map(l => l.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = el('a', { href: url, download: `atualizacoes_cadastrais_${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`${r.linhas.length} registro(s) exportado(s).`, 'ok');
  } catch (err) {
    tratarErroRh(err);
  } finally {
    fimCarregando();
  }
}

async function gerarCodigo(e) {
  e.preventDefault();
  const matricula = $('#cod-matricula').value.trim();
  if (!matricula) return toast('Informe a matrícula.', 'erro');
  if (!(await confirmar(`Gerar um novo código para a matrícula ${matricula}? O código atual dela deixa de funcionar.`, 'Gerar código'))) return;
  carregando('Gerando código…');
  try {
    const r = await api('adminCodigo', { token: A.token, matricula });
    const box = $('#codigo-resultado');
    const ocultar = el('button', { type: 'button', class: 'btn-link' }, 'Ocultar código');
    ocultar.addEventListener('click', () => { box.hidden = true; box.replaceChildren(); });
    box.replaceChildren(
      el('p', {}, `${r.nome} (matrícula ${r.matricula})`),
      el('p', { class: 'codigo' }, r.codigo),
      el('p', { class: 'dica' }, `Válido até ${fmtData(r.expiraEm)}. Entregue pessoalmente ao funcionário: este código não será exibido de novo.`),
      ocultar);
    box.hidden = false;
    $('#cod-matricula').value = '';
  } catch (err) {
    tratarErroRh(err);
  } finally {
    fimCarregando();
  }
}

/* ---------- Inicialização ---------- */

function ligarEventos() {
  const logo = $('#logo');
  const semLogo = () => { logo.hidden = true; $('.marca-texto').hidden = false; };
  logo.addEventListener('error', semLogo);
  if (logo.complete && !logo.naturalWidth) semLogo();

  $('#f-uf').append(...UFS.map(u => el('option', { value: u }, u)));

  $('#form-login').addEventListener('submit', entrar);
  $$('.card[data-ir]').forEach(c => c.addEventListener('click', () => comecar(c.dataset.ir)));
  $('#btn-iniciar').addEventListener('click', () => comecar('endereco'));
  $('#btn-login-voltar').addEventListener('click', () => irPara('inicio'));
  $('#btn-continuar').addEventListener('click', continuar);
  $('#btn-voltar').addEventListener('click', voltar);
  $('#btn-sair').addEventListener('click', () => sair(true));
  $('#btn-status-sair').addEventListener('click', () => sair(false));
  $('#btn-encerrar').addEventListener('click', () => sair(false));
  $('#btn-imprimir').addEventListener('click', () => window.print());
  $('#btn-enviar').addEventListener('click', enviar);
  $('#f-declaro').addEventListener('change', () => { $('#e-declaro').textContent = ''; });

  $('#f-cep').addEventListener('input', e => { e.target.value = mascaraCep(e.target.value); if (so(e.target.value).length === 8) buscarCep(); });
  ['f-tel1', 'f-tel2', 'f-tel3'].forEach(id => $('#' + id).addEventListener('input', e => { e.target.value = mascaraTel(e.target.value); }));
  $('#app-func').addEventListener('input', e => {
    if (e.target.matches('.grade input, .grade select')) {
      S.sujo = true;
      if (e.target.getAttribute('aria-invalid') === 'true') marcarErro(e.target.id, '');
    }
  });
  $('#f-uf').addEventListener('change', e => marcarErro(e.target.id, ''));

  $('#btn-camera').addEventListener('click', abrirCamera);
  $('#btn-galeria').addEventListener('click', () => $('#f-arquivo').click());
  $('#f-arquivo').addEventListener('change', escolherArquivo);
  $('#f-camera').addEventListener('change', escolherArquivo);
  $('#btn-capturar').addEventListener('click', capturar);
  $('#dlg-camera').addEventListener('close', pararCamera);
  $('#btn-remover-foto').addEventListener('click', () => {
    if (S.foto) URL.revokeObjectURL(S.foto.url);
    S.foto = null;
    atualizarSelfie();
  });
  $('#f-manter-foto').addEventListener('change', e => {
    S.manterFoto = e.target.checked;
    if (S.manterFoto && S.foto) { URL.revokeObjectURL(S.foto.url); S.foto = null; }
    S.sujo = true;
    atualizarSelfie();
  });

  $$('[data-fechar]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  $('#form-rh-login').addEventListener('submit', entrarRh);
  $('#form-rh-filtros').addEventListener('submit', e => { e.preventDefault(); carregarLista(); });
  $('#rh-sair').addEventListener('click', () => sairRh());
  $('#rh-exportar').addEventListener('click', exportarCsv);
  $('#form-codigo').addEventListener('submit', gerarCodigo);
  $$('#rh-stats .stat').forEach(b => b.addEventListener('click', () => {
    $('#rh-status').value = $('#rh-status').value === b.dataset.status ? '' : b.dataset.status;
    carregarLista();
  }));

  window.addEventListener('hashchange', rota);
  window.addEventListener('beforeunload', e => {
    if (S.sujo && S.token) { e.preventDefault(); e.returnValue = ''; }
  });
}

async function iniciar() {
  ligarEventos();
  rota();
  irPara('inicio');
  try {
    S.config = await api('config');
    montarUniforme();
  } catch (err) {
    mostrarMsg($('#login-msg'), err.message, 'alerta');
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
