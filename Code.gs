const CFG = {
  PASTA_FOTOS: 'VEGAS_RH_FOTOS_CADASTRAIS',
  FUSO: 'America/Sao_Paulo',
  SESSAO_FUNC_SEG: 1800,
  SESSAO_ADMIN_SEG: 3600,
  MAX_TENTATIVAS: 5,
  BLOQUEIO_SEG: 900,
  CODIGO_TAMANHO: 8,
  CODIGO_VALIDADE_DIAS: 30,
  FOTO_OBRIGATORIA: true,
  FOTO_MAX_BYTES: 700 * 1024,
  FOTO_MIN_BYTES: 4 * 1024,
  HASH_ITERACOES: 300,
  RETENCAO_FOTOS_DIAS: 730,
  LISTA_MAX: 300,
  VERSAO: '1.0.0'
};

const STATUS = {
  PENDENTE: 'PENDENTE',
  EM_ANALISE: 'EM_ANALISE',
  APROVADA: 'APROVADA',
  DEVOLVIDA: 'DEVOLVIDA_PARA_CORRECAO'
};

const TRANSICOES = {
  PENDENTE: ['EM_ANALISE', 'APROVADA', 'DEVOLVIDA_PARA_CORRECAO'],
  EM_ANALISE: ['APROVADA', 'DEVOLVIDA_PARA_CORRECAO', 'PENDENTE'],
  APROVADA: [],
  DEVOLVIDA_PARA_CORRECAO: []
};

const PERMISSOES = {
  GESTOR: ['ver', 'analisar', 'foto', 'exportar', 'codigos'],
  ANALISTA: ['ver', 'analisar', 'foto', 'exportar'],
  LEITURA: ['ver']
};

const ABAS = {
  FUNCIONARIOS: ['ID_FUNCIONARIO', 'MATRICULA', 'NOME_COMPLETO', 'STATUS', 'EMAIL_CORPORATIVO', 'HASH_CREDENCIAL', 'DATA_CADASTRO', 'UNIDADE', 'CODIGO_EXPIRA_EM'],
  ATUALIZACOES: ['ID_ATUALIZACAO', 'PROTOCOLO', 'ID_FUNCIONARIO', 'MATRICULA', 'NOME_COMPLETO', 'UNIDADE',
    'CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF', 'PONTO_REFERENCIA',
    'TELEFONE_PRINCIPAL', 'TELEFONE_ALTERNATIVO', 'CONTATO_EMERGENCIA', 'TELEFONE_EMERGENCIA',
    'TAMANHO_CAMISA', 'TAMANHO_CALCA', 'TAMANHO_JAQUETA', 'TAMANHO_BERMUDA', 'TAMANHO_CALCADO', 'TAMANHOS_EXTRAS',
    'FOTO_FILE_ID', 'FOTO_URL_RESTRITA', 'DATA_ENVIO', 'STATUS_ANALISE', 'OBSERVACAO_RH', 'DATA_ANALISE', 'ANALISADO_POR', 'REQUEST_ID'],
  HISTORICO: ['ID_EVENTO', 'PROTOCOLO', 'ID_FUNCIONARIO', 'ACAO', 'DATA_HORA', 'RESPONSAVEL', 'OBSERVACAO'],
  ADMINS: ['USUARIO', 'NOME', 'HASH_SENHA', 'PERFIL', 'ATIVO'],
  OPCOES_UNIFORME: ['CHAVE', 'PECA', 'ATIVA', 'OBRIGATORIA', 'OPCOES']
};

const OPCOES_PADRAO = [
  ['CAMISA', 'Camisa / camiseta', 'SIM', 'SIM', 'PP,P,M,G,GG,XGG,EG,EGG'],
  ['CALCA', 'Calça', 'SIM', 'SIM', '36,38,40,42,44,46,48,50,52,54,56,58,60'],
  ['JAQUETA', 'Jaqueta / blusa de frio', 'SIM', 'NAO', 'PP,P,M,G,GG,XGG,EG'],
  ['BERMUDA', 'Bermuda', 'NAO', 'NAO', '36,38,40,42,44,46,48,50,52,54'],
  ['CALCADO', 'Calçado', 'SIM', 'SIM', '33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48']
];

const PECAS_FIXAS = { CAMISA: 'TAMANHO_CAMISA', CALCA: 'TAMANHO_CALCA', JAQUETA: 'TAMANHO_JAQUETA', BERMUDA: 'TAMANHO_BERMUDA', CALCADO: 'TAMANHO_CALCADO' };
const NAO_USA = 'NAO_USA';
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const RE_CEL = /^[1-9][1-9]9\d{8}$/;
const RE_TEL = /^[1-9][1-9](9\d{8}|[2-5]\d{7})$/;
const RE_PROTOCOLO = /^VEGAS-CAD-\d{8}-[A-Z0-9]{5}$/;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class ErroApp extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

const ROTAS = {
  config: config_,
  login: login_,
  me: me_,
  enviar: enviar_,
  sair: sair_,
  adminLogin: adminLogin_,
  adminListar: adminListar_,
  adminDetalhe: adminDetalhe_,
  adminFoto: adminFoto_,
  adminStatus: adminStatus_,
  adminExportar: adminExportar_,
  adminCodigo: adminCodigo_
};

function doGet() {
  return json_({ ok: true, data: { app: 'vegas-atualizacao-cadastral', versao: CFG.VERSAO } });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (_) {
    return json_({ ok: false, code: 'REQ_INVALIDA', msg: 'Requisição inválida.' });
  }
  const rota = req && Object.prototype.hasOwnProperty.call(ROTAS, req.action) ? ROTAS[req.action] : null;
  if (!rota) return json_({ ok: false, code: 'ACAO_INVALIDA', msg: 'Ação inválida.' });
  try {
    return json_({ ok: true, data: rota(req) });
  } catch (err) {
    if (err instanceof ErroApp) return json_({ ok: false, code: err.code, msg: err.message });
    console.error('Falha na ação ' + req.action + ': ' + (err && err.stack ? err.stack : err));
    return json_({ ok: false, code: 'ERRO_INTERNO', msg: 'Não foi possível concluir agora. Tente novamente em alguns minutos.' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Rotas do funcionário ---------- */

function config_() {
  return { fotoObrigatoria: CFG.FOTO_OBRIGATORIA, fotoMaxBytes: CFG.FOTO_MAX_BYTES, pecas: opcoesUniforme_() };
}

function login_(req) {
  const matricula = normMatricula_(req.matricula);
  const codigo = normCodigo_(req.codigo);
  if (!matricula || codigo.length < 6) throw new ErroApp('DADOS_INVALIDOS', 'Informe matrícula e código de acesso.');
  const chave = 'f:' + matricula;
  checarBloqueio_(chave);

  const f = ler_('FUNCIONARIOS').rows.find(r => normMatricula_(r.MATRICULA) === matricula);
  const valido = !!f && ativo_(f) && !!texto_(f.HASH_CREDENCIAL) && conferirHash_(codigo, texto_(f.HASH_CREDENCIAL));
  if (!f) hashSegredo_(codigo, 'equalizacao');
  if (!valido) {
    registrarFalha_(chave);
    throw new ErroApp('CREDENCIAIS', 'Matrícula ou código de acesso incorretos.');
  }
  const expira = texto_(f.CODIGO_EXPIRA_EM);
  if (expira && expira < agora_()) {
    throw new ErroApp('CODIGO_EXPIRADO', 'Seu código de acesso expirou. Peça um novo ao Departamento Pessoal.');
  }
  limparFalhas_(chave);
  const token = criarSessao_({ tipo: 'F', id: texto_(f.ID_FUNCIONARIO), ttl: CFG.SESSAO_FUNC_SEG });
  return Object.assign({ token }, perfilFuncionario_(f));
}

function me_(req) {
  const s = sessao_(req.token, 'F');
  const f = funcionarioPorId_(s.id);
  if (!f || !ativo_(f)) throw new ErroApp('NAO_AUTORIZADO', 'Seu cadastro não está liberado para atualização. Procure o Departamento Pessoal.');
  return perfilFuncionario_(f);
}

function sair_(req) {
  if (typeof req.token === 'string' && /^[a-f0-9]{64}$/.test(req.token)) {
    CacheService.getScriptCache().remove('ses:' + req.token);
  }
  return {};
}

function enviar_(req) {
  const s = sessao_(req.token, 'F');
  const requestId = String(req.requestId || '');
  if (!/^[a-f0-9-]{20,40}$/i.test(requestId)) throw new ErroApp('REQ_INVALIDA', 'Requisição inválida. Recarregue a página.');

  const cache = CacheService.getScriptCache();
  const repetido = cache.get('req:' + requestId);
  if (repetido) return JSON.parse(repetido);

  const pecas = opcoesUniforme_();
  const dados = validarDados_(req.dados || {}, pecas);
  const fotoBlob = req.foto ? validarFoto_(req.foto) : null;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new ErroApp('OCUPADO', 'Muitos envios ao mesmo tempo. Aguarde alguns segundos e tente de novo.');
  let arquivo = null;
  try {
    const f = funcionarioPorId_(s.id);
    if (!f || !ativo_(f)) throw new ErroApp('NAO_AUTORIZADO', 'Seu cadastro não está liberado para atualização. Procure o Departamento Pessoal.');

    const t = ler_('ATUALIZACOES');
    const meus = t.rows.filter(r => texto_(r.ID_FUNCIONARIO) === s.id);
    const ultima = maisRecente_(meus);
    if (ultima && [STATUS.PENDENTE, STATUS.EM_ANALISE].indexOf(texto_(ultima.STATUS_ANALISE)) >= 0) {
      throw new ErroApp('JA_PENDENTE', 'Você já tem uma atualização em análise (protocolo ' + texto_(ultima.PROTOCOLO) + '). Aguarde o retorno do Departamento Pessoal.');
    }

    const agora = new Date();
    let fotoId = '';
    let fotoUrl = '';
    if (fotoBlob) {
      arquivo = salvarFoto_(fotoBlob, s.id, agora);
      fotoId = arquivo.getId();
      fotoUrl = arquivo.getUrl();
    } else if (req.manterFotoAtual) {
      const vigente = fotoVigente_(meus);
      if (!vigente) throw new ErroApp('FOTO_OBRIGATORIA', 'Não há foto anterior no cadastro. Envie uma selfie.');
      fotoId = texto_(vigente.FOTO_FILE_ID);
      fotoUrl = texto_(vigente.FOTO_URL_RESTRITA);
    } else if (CFG.FOTO_OBRIGATORIA) {
      throw new ErroApp('FOTO_OBRIGATORIA', 'Envie uma selfie para concluir.');
    }

    const protocolo = gerarProtocolo_(new Set(t.rows.map(r => texto_(r.PROTOCOLO))));
    const linha = Object.assign({
      ID_ATUALIZACAO: Utilities.getUuid(),
      PROTOCOLO: protocolo,
      ID_FUNCIONARIO: s.id,
      MATRICULA: texto_(f.MATRICULA),
      NOME_COMPLETO: texto_(f.NOME_COMPLETO),
      UNIDADE: texto_(f.UNIDADE),
      FOTO_FILE_ID: fotoId,
      FOTO_URL_RESTRITA: fotoUrl,
      DATA_ENVIO: formatar_(agora),
      STATUS_ANALISE: STATUS.PENDENTE,
      REQUEST_ID: requestId
    }, dadosParaLinha_(dados));

    anexar_('ATUALIZACOES', linha);
    arquivo = null;
    SpreadsheetApp.flush();

    const corrigindo = ultima && texto_(ultima.STATUS_ANALISE) === STATUS.DEVOLVIDA;
    registrarEvento_(protocolo, s.id, corrigindo ? 'CORRECAO_ENVIADA' : 'ATUALIZACAO_ENVIADA', 'FUNCIONARIO',
      corrigindo ? 'Corrige o protocolo ' + texto_(ultima.PROTOCOLO) : '');

    const resposta = { protocolo, dataHora: Utilities.formatDate(agora, CFG.FUSO, 'dd/MM/yyyy HH:mm') };
    cache.put('req:' + requestId, JSON.stringify(resposta), 600);
    return resposta;
  } catch (err) {
    if (arquivo) {
      try { arquivo.setTrashed(true); } catch (_) { console.error('Foto órfã não removida: ' + arquivo.getId()); }
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Rotas do RH ---------- */

function adminLogin_(req) {
  const usuario = String(req.usuario || '').trim().toLowerCase().slice(0, 40);
  const senha = String(req.senha || '');
  if (!usuario || !senha) throw new ErroApp('DADOS_INVALIDOS', 'Informe usuário e senha.');
  const chave = 'a:' + usuario;
  checarBloqueio_(chave);

  const a = ler_('ADMINS').rows.find(r => texto_(r.USUARIO).toLowerCase() === usuario);
  const perfil = a ? texto_(a.PERFIL).toUpperCase() : '';
  const valido = !!a && sim_(a.ATIVO) && !!PERMISSOES[perfil] && conferirHash_(senha, texto_(a.HASH_SENHA));
  if (!a) hashSegredo_(senha, 'equalizacao');
  if (!valido) {
    registrarFalha_(chave);
    throw new ErroApp('CREDENCIAIS', 'Usuário ou senha incorretos.');
  }
  limparFalhas_(chave);
  const token = criarSessao_({ tipo: 'A', usuario, perfil, ttl: CFG.SESSAO_ADMIN_SEG });
  registrarEvento_('', '', 'LOGIN_RH', usuario, '');
  return { token, usuario, nome: texto_(a.NOME), perfil, permissoes: PERMISSOES[perfil] };
}

function adminListar_(req) {
  sessaoAdmin_(req.token, 'ver');
  const t = ler_('ATUALIZACOES');
  const stats = { PENDENTE: 0, EM_ANALISE: 0, APROVADA: 0, DEVOLVIDA_PARA_CORRECAO: 0 };
  const unidades = new Set();
  t.rows.forEach(r => {
    const st = texto_(r.STATUS_ANALISE);
    if (stats[st] !== undefined) stats[st]++;
    if (texto_(r.UNIDADE)) unidades.add(texto_(r.UNIDADE));
  });
  const filtrados = ordenarDesc_(filtrar_(t.rows, req.filtros || {}));
  return {
    total: filtrados.length,
    stats,
    unidades: Array.from(unidades).sort(),
    itens: filtrados.slice(0, CFG.LISTA_MAX).map(r => ({
      protocolo: texto_(r.PROTOCOLO),
      matricula: texto_(r.MATRICULA),
      nome: texto_(r.NOME_COMPLETO),
      unidade: texto_(r.UNIDADE),
      dataEnvio: texto_(r.DATA_ENVIO),
      status: texto_(r.STATUS_ANALISE)
    }))
  };
}

function adminDetalhe_(req) {
  sessaoAdmin_(req.token, 'ver');
  const t = ler_('ATUALIZACOES');
  const r = porProtocolo_(t, req.protocolo);
  const id = texto_(r.ID_FUNCIONARIO);
  const anteriores = ordenarDesc_(t.rows.filter(x => texto_(x.ID_FUNCIONARIO) === id && x._linha !== r._linha &&
    (texto_(x.DATA_ENVIO) < texto_(r.DATA_ENVIO) || (texto_(x.DATA_ENVIO) === texto_(r.DATA_ENVIO) && x._linha < r._linha))));
  const anterior = anteriores.find(x => texto_(x.STATUS_ANALISE) === STATUS.APROVADA) || anteriores[0] || null;
  const prot = texto_(r.PROTOCOLO);
  const historico = ler_('HISTORICO').rows
    .filter(h => texto_(h.PROTOCOLO) === prot)
    .map(h => ({ acao: texto_(h.ACAO), dataHora: texto_(h.DATA_HORA), responsavel: texto_(h.RESPONSAVEL), observacao: texto_(h.OBSERVACAO) }))
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return { registro: publicoAdmin_(r), anterior: anterior ? publicoAdmin_(anterior) : null, historico };
}

function adminFoto_(req) {
  const s = sessaoAdmin_(req.token, 'foto');
  const r = porProtocolo_(ler_('ATUALIZACOES'), req.protocolo);
  const id = texto_(r.FOTO_FILE_ID);
  if (!id || texto_(r.FOTO_URL_RESTRITA).indexOf('EXCLUIDA') === 0) throw new ErroApp('SEM_FOTO', 'Esta atualização não tem foto disponível.');
  let blob;
  try {
    blob = DriveApp.getFileById(id).getBlob();
  } catch (_) {
    throw new ErroApp('SEM_FOTO', 'A foto não foi encontrada no Drive.');
  }
  registrarEvento_(texto_(r.PROTOCOLO), texto_(r.ID_FUNCIONARIO), 'FOTO_VISUALIZADA', s.usuario, '');
  return { dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}

function adminStatus_(req) {
  const s = sessaoAdmin_(req.token, 'analisar');
  const novo = String(req.status || '');
  const obs = limpar_(req.observacao).slice(0, 500);
  if (!Object.keys(TRANSICOES).includes(novo)) throw new ErroApp('DADOS_INVALIDOS', 'Situação inválida.');
  if (novo === STATUS.DEVOLVIDA && obs.length < 5) throw new ErroApp('DADOS_INVALIDOS', 'Explique ao funcionário o que precisa ser corrigido.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new ErroApp('OCUPADO', 'Sistema ocupado. Tente de novo em alguns segundos.');
  try {
    const t = ler_('ATUALIZACOES');
    const r = porProtocolo_(t, req.protocolo);
    const atual = texto_(r.STATUS_ANALISE);
    if ((TRANSICOES[atual] || []).indexOf(novo) < 0) {
      throw new ErroApp('TRANSICAO_INVALIDA', 'Esta atualização já está como ' + atual + ' e não pode passar para ' + novo + '.');
    }
    const campos = { STATUS_ANALISE: novo, ANALISADO_POR: s.usuario };
    if (novo === STATUS.APROVADA || novo === STATUS.DEVOLVIDA) {
      campos.DATA_ANALISE = formatar_(new Date());
      campos.OBSERVACAO_RH = obs;
    }
    atualizarCampos_(t, r._linha, campos);
    SpreadsheetApp.flush();
    registrarEvento_(texto_(r.PROTOCOLO), texto_(r.ID_FUNCIONARIO), 'STATUS_' + novo, s.usuario, obs);
    Object.assign(r, campos);
    return publicoAdmin_(r);
  } finally {
    lock.releaseLock();
  }
}

function adminExportar_(req) {
  const s = sessaoAdmin_(req.token, 'exportar');
  const t = ler_('ATUALIZACOES');
  const lista = ordenarDesc_(filtrar_(t.rows, req.filtros || {}));
  const cab = t.headers.filter(h => ['ID_ATUALIZACAO', 'REQUEST_ID', 'FOTO_URL_RESTRITA'].indexOf(h) < 0);
  registrarEvento_('', '', 'EXPORTACAO_CSV', s.usuario, lista.length + ' registro(s)');
  return { cabecalho: cab, linhas: lista.map(r => cab.map(h => texto_(r[h]))) };
}

function adminCodigo_(req) {
  const s = sessaoAdmin_(req.token, 'codigos');
  const matricula = normMatricula_(req.matricula);
  if (!matricula) throw new ErroApp('DADOS_INVALIDOS', 'Informe a matrícula.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new ErroApp('OCUPADO', 'Sistema ocupado. Tente de novo em alguns segundos.');
  try {
    const t = ler_('FUNCIONARIOS');
    const f = t.rows.find(r => normMatricula_(r.MATRICULA) === matricula);
    if (!f) throw new ErroApp('NAO_ENCONTRADO', 'Matrícula não encontrada na aba FUNCIONARIOS.');
    if (!ativo_(f)) throw new ErroApp('INATIVO', 'Este funcionário não está com STATUS = ATIVO.');
    const codigo = aleatorio_(CFG.CODIGO_TAMANHO);
    const expira = formatar_(new Date(Date.now() + CFG.CODIGO_VALIDADE_DIAS * 864e5));
    const campos = { HASH_CREDENCIAL: gerarHash_(codigo), CODIGO_EXPIRA_EM: expira };
    let id = texto_(f.ID_FUNCIONARIO);
    if (!id) { id = novoIdFuncionario_(); campos.ID_FUNCIONARIO = id; }
    if (!texto_(f.DATA_CADASTRO)) campos.DATA_CADASTRO = agora_();
    atualizarCampos_(t, f._linha, campos);
    SpreadsheetApp.flush();
    limparFalhas_('f:' + matricula);
    registrarEvento_('', id, 'CODIGO_REDEFINIDO', s.usuario, '');
    return { matricula, nome: texto_(f.NOME_COMPLETO), codigo: formatarCodigo_(codigo), expiraEm: expira };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Regras de negócio ---------- */

function perfilFuncionario_(f) {
  const id = texto_(f.ID_FUNCIONARIO);
  const meus = ler_('ATUALIZACOES').rows.filter(r => texto_(r.ID_FUNCIONARIO) === id);
  const u = maisRecente_(meus);
  const st = u ? texto_(u.STATUS_ANALISE) : '';
  return {
    id,
    matricula: texto_(f.MATRICULA),
    nome: texto_(f.NOME_COMPLETO),
    unidade: texto_(f.UNIDADE),
    bloqueada: [STATUS.PENDENTE, STATUS.EM_ANALISE].indexOf(st) >= 0,
    ultima: u ? {
      protocolo: texto_(u.PROTOCOLO),
      status: st,
      dataEnvio: texto_(u.DATA_ENVIO),
      observacaoRh: st === STATUS.DEVOLVIDA ? texto_(u.OBSERVACAO_RH) : '',
      temFoto: !!fotoVigente_(meus),
      dados: linhaParaDados_(u)
    } : null
  };
}

function validarDados_(e, pecas) {
  const erros = [];
  const d = {
    cep: so_(e.cep),
    logradouro: limpar_(e.logradouro).slice(0, 120),
    numero: limpar_(e.numero).toUpperCase().slice(0, 10),
    complemento: limpar_(e.complemento).slice(0, 60),
    bairro: limpar_(e.bairro).slice(0, 60),
    cidade: limpar_(e.cidade).slice(0, 60),
    uf: limpar_(e.uf).toUpperCase(),
    referencia: limpar_(e.referencia).slice(0, 120),
    telPrincipal: so_(e.telPrincipal),
    telAlternativo: so_(e.telAlternativo),
    contatoEmergencia: limpar_(e.contatoEmergencia).slice(0, 60),
    telEmergencia: so_(e.telEmergencia),
    uniforme: {}
  };
  if (d.cep.length !== 8) erros.push('CEP');
  if (d.logradouro.length < 3) erros.push('rua/avenida');
  if (!/^[0-9A-Z\/\- ]{1,10}$/.test(d.numero)) erros.push('número');
  if (d.bairro.length < 2) erros.push('bairro');
  if (d.cidade.length < 2) erros.push('cidade');
  if (UFS.indexOf(d.uf) < 0) erros.push('estado');
  if (!RE_CEL.test(d.telPrincipal)) erros.push('celular principal');
  if (d.telAlternativo && !RE_TEL.test(d.telAlternativo)) erros.push('telefone alternativo');
  if (d.telEmergencia && !RE_TEL.test(d.telEmergencia)) erros.push('telefone de emergência');
  if (!!d.telEmergencia !== !!d.contatoEmergencia) erros.push('contato de emergência (nome e telefone juntos)');

  const u = e.uniforme && typeof e.uniforme === 'object' ? e.uniforme : {};
  pecas.forEach(p => {
    const v = limpar_(u[p.chave]);
    const ok = p.opcoes.indexOf(v) >= 0 || (!p.obrigatoria && v === NAO_USA);
    if (ok) d.uniforme[p.chave] = v;
    else erros.push('tamanho de ' + p.peca.toLowerCase());
  });

  if (erros.length) throw new ErroApp('DADOS_INVALIDOS', 'Revise: ' + erros.join(', ') + '.');
  return d;
}

function validarFoto_(foto) {
  const mime = String(foto.mime || '');
  if (['image/jpeg', 'image/webp'].indexOf(mime) < 0) throw new ErroApp('FOTO_INVALIDA', 'Formato de foto não aceito. Use JPEG ou WebP.');
  const b64 = String(foto.base64 || '');
  if (b64.length > CFG.FOTO_MAX_BYTES * 1.4) throw new ErroApp('FOTO_GRANDE', 'A foto está grande demais. Tire outra.');
  let bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (_) { throw new ErroApp('FOTO_INVALIDA', 'A foto chegou corrompida. Tente de novo.'); }
  if (bytes.length > CFG.FOTO_MAX_BYTES) throw new ErroApp('FOTO_GRANDE', 'A foto está grande demais. Tire outra.');
  if (bytes.length < CFG.FOTO_MIN_BYTES) throw new ErroApp('FOTO_INVALIDA', 'A foto parece vazia. Tire outra.');
  const b = i => bytes[i] & 0xff;
  const ehJpeg = b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff;
  const ehWebp = String.fromCharCode(b(0), b(1), b(2), b(3)) === 'RIFF' && String.fromCharCode(b(8), b(9), b(10), b(11)) === 'WEBP';
  if ((mime === 'image/jpeg' && !ehJpeg) || (mime === 'image/webp' && !ehWebp)) throw new ErroApp('FOTO_INVALIDA', 'O arquivo enviado não é uma imagem válida.');
  return Utilities.newBlob(bytes, mime);
}

function salvarFoto_(blob, idFuncionario, data) {
  const raiz = DriveApp.getFolderById(prop_('FOLDER_ID'));
  const ano = Utilities.formatDate(data, CFG.FUSO, 'yyyy');
  const it = raiz.getFoldersByName(ano);
  const pasta = it.hasNext() ? it.next() : raiz.createFolder(ano);
  const ext = blob.getContentType() === 'image/webp' ? '.webp' : '.jpg';
  const nome = 'FUNC_' + idFuncionario + '_' + Utilities.formatDate(data, CFG.FUSO, 'yyyyMMdd-HHmmss') + ext;
  return pasta.createFile(blob.setName(nome));
}

function fotoVigente_(linhas) {
  return ordenarDesc_(linhas).find(r => texto_(r.FOTO_FILE_ID) && texto_(r.FOTO_URL_RESTRITA).indexOf('EXCLUIDA') !== 0) || null;
}

function dadosParaLinha_(d) {
  const l = {
    CEP: d.cep, LOGRADOURO: d.logradouro, NUMERO: d.numero, COMPLEMENTO: d.complemento, BAIRRO: d.bairro,
    CIDADE: d.cidade, UF: d.uf, PONTO_REFERENCIA: d.referencia,
    TELEFONE_PRINCIPAL: d.telPrincipal, TELEFONE_ALTERNATIVO: d.telAlternativo,
    CONTATO_EMERGENCIA: d.contatoEmergencia, TELEFONE_EMERGENCIA: d.telEmergencia
  };
  const extras = {};
  Object.keys(d.uniforme).forEach(k => {
    if (PECAS_FIXAS[k]) l[PECAS_FIXAS[k]] = d.uniforme[k];
    else extras[k] = d.uniforme[k];
  });
  l.TAMANHOS_EXTRAS = Object.keys(extras).length ? JSON.stringify(extras) : '';
  return l;
}

function linhaParaDados_(r) {
  const uniforme = {};
  Object.keys(PECAS_FIXAS).forEach(k => { const v = texto_(r[PECAS_FIXAS[k]]); if (v) uniforme[k] = v; });
  try { Object.assign(uniforme, JSON.parse(texto_(r.TAMANHOS_EXTRAS) || '{}')); } catch (_) { }
  return {
    cep: texto_(r.CEP), logradouro: texto_(r.LOGRADOURO), numero: texto_(r.NUMERO), complemento: texto_(r.COMPLEMENTO),
    bairro: texto_(r.BAIRRO), cidade: texto_(r.CIDADE), uf: texto_(r.UF), referencia: texto_(r.PONTO_REFERENCIA),
    telPrincipal: texto_(r.TELEFONE_PRINCIPAL), telAlternativo: texto_(r.TELEFONE_ALTERNATIVO),
    contatoEmergencia: texto_(r.CONTATO_EMERGENCIA), telEmergencia: texto_(r.TELEFONE_EMERGENCIA), uniforme
  };
}

function publicoAdmin_(r) {
  return {
    protocolo: texto_(r.PROTOCOLO), matricula: texto_(r.MATRICULA), nome: texto_(r.NOME_COMPLETO), unidade: texto_(r.UNIDADE),
    dataEnvio: texto_(r.DATA_ENVIO), status: texto_(r.STATUS_ANALISE), observacaoRh: texto_(r.OBSERVACAO_RH),
    dataAnalise: texto_(r.DATA_ANALISE), analisadoPor: texto_(r.ANALISADO_POR),
    temFoto: !!texto_(r.FOTO_FILE_ID) && texto_(r.FOTO_URL_RESTRITA).indexOf('EXCLUIDA') !== 0,
    dados: linhaParaDados_(r)
  };
}

function opcoesUniforme_() {
  return ler_('OPCOES_UNIFORME').rows
    .filter(r => sim_(r.ATIVA))
    .map(r => ({
      chave: texto_(r.CHAVE).toUpperCase().replace(/[^A-Z0-9_]/g, ''),
      peca: texto_(r.PECA),
      obrigatoria: sim_(r.OBRIGATORIA),
      opcoes: texto_(r.OPCOES).split(/[,;]/).map(x => x.trim()).filter(Boolean)
    }))
    .filter(p => p.chave && p.peca && p.opcoes.length);
}

function filtrar_(rows, f) {
  const txt = norm_(f.texto);
  const st = String(f.status || '');
  const un = String(f.unidade || '');
  const reData = /^\d{4}-\d{2}-\d{2}$/;
  const de = reData.test(f.de) ? f.de : '';
  const ate = reData.test(f.ate) ? f.ate : '';
  return rows.filter(r => {
    if (st && texto_(r.STATUS_ANALISE) !== st) return false;
    if (un && texto_(r.UNIDADE) !== un) return false;
    const dia = texto_(r.DATA_ENVIO).slice(0, 10);
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    if (txt && norm_([r.PROTOCOLO, r.MATRICULA, r.NOME_COMPLETO].map(texto_).join(' ')).indexOf(txt) < 0) return false;
    return true;
  });
}

function porProtocolo_(t, protocolo) {
  const p = String(protocolo || '').trim().toUpperCase();
  if (!RE_PROTOCOLO.test(p)) throw new ErroApp('NAO_ENCONTRADO', 'Protocolo inválido.');
  const r = t.rows.find(x => texto_(x.PROTOCOLO) === p);
  if (!r) throw new ErroApp('NAO_ENCONTRADO', 'Protocolo não encontrado.');
  return r;
}

function funcionarioPorId_(id) {
  if (!id) return null;
  return ler_('FUNCIONARIOS').rows.find(r => texto_(r.ID_FUNCIONARIO) === id) || null;
}

function gerarProtocolo_(existentes) {
  const dia = Utilities.formatDate(new Date(), CFG.FUSO, 'yyyyMMdd');
  for (let i = 0; i < 20; i++) {
    const p = 'VEGAS-CAD-' + dia + '-' + aleatorio_(5);
    if (!existentes.has(p)) return p;
  }
  throw new Error('Não foi possível gerar protocolo único');
}

/* ---------- Segurança ---------- */

function hashSegredo_(segredo, salt) {
  let h = salt + '|' + segredo + '|' + (prop_('PEPPER') || '');
  for (let i = 0; i < CFG.HASH_ITERACOES; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function gerarHash_(segredo) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return salt + ':' + hashSegredo_(segredo, salt);
}

function conferirHash_(segredo, armazenado) {
  const partes = String(armazenado || '').split(':');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return false;
  return igualSeguro_(hashSegredo_(segredo, partes[0]), partes[1]);
}

function igualSeguro_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function aleatorio_(n) {
  let s = '';
  while (s.length < n) {
    const hex = Utilities.getUuid().replace(/-/g, '');
    for (let i = 0; i < hex.length - 1 && s.length < n; i += 2) {
      if (i === 12 || i === 16) continue;
      s += ALFABETO[parseInt(hex.substr(i, 2), 16) % ALFABETO.length];
    }
  }
  return s;
}

function criarSessao_(dados) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  CacheService.getScriptCache().put('ses:' + token, JSON.stringify(dados), dados.ttl);
  return token;
}

function sessao_(token, tipo) {
  const expirada = new ErroApp('SESSAO_EXPIRADA', 'Sua sessão expirou. Entre novamente.');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw expirada;
  const cache = CacheService.getScriptCache();
  const raw = cache.get('ses:' + token);
  if (!raw) throw expirada;
  const s = JSON.parse(raw);
  if (s.tipo !== tipo) throw expirada;
  cache.put('ses:' + token, raw, s.ttl);
  return s;
}

function sessaoAdmin_(token, permissao) {
  const s = sessao_(token, 'A');
  const a = ler_('ADMINS').rows.find(r => texto_(r.USUARIO).toLowerCase() === s.usuario);
  if (!a || !sim_(a.ATIVO)) {
    CacheService.getScriptCache().remove('ses:' + token);
    throw new ErroApp('SESSAO_EXPIRADA', 'Seu acesso foi desativado.');
  }
  const perfil = texto_(a.PERFIL).toUpperCase();
  if ((PERMISSOES[perfil] || []).indexOf(permissao) < 0) throw new ErroApp('SEM_PERMISSAO', 'Seu perfil não permite esta ação.');
  s.perfil = perfil;
  return s;
}

function checarBloqueio_(chave) {
  if (CacheService.getScriptCache().get('blq:' + chave)) {
    throw new ErroApp('BLOQUEADO', 'Muitas tentativas sem sucesso. Aguarde 15 minutos e tente de novo.');
  }
}

function registrarFalha_(chave) {
  const c = CacheService.getScriptCache();
  const n = Number(c.get('tnt:' + chave) || 0) + 1;
  if (n >= CFG.MAX_TENTATIVAS) {
    c.put('blq:' + chave, '1', CFG.BLOQUEIO_SEG);
    c.remove('tnt:' + chave);
    registrarEvento_('', '', 'BLOQUEIO_ACESSO', chave, CFG.MAX_TENTATIVAS + ' tentativas inválidas');
  } else {
    c.put('tnt:' + chave, String(n), CFG.BLOQUEIO_SEG);
  }
  Utilities.sleep(400);
}

function limparFalhas_(chave) {
  CacheService.getScriptCache().removeAll(['tnt:' + chave, 'blq:' + chave]);
}

/* ---------- Planilha ---------- */

function ss_() {
  const id = prop_('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID ausente: execute Vegas RH > Configurar estrutura');
  return SpreadsheetApp.openById(id);
}

function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}

function aba_(nome) {
  const sh = ss_().getSheetByName(nome);
  if (!sh) throw new Error('Aba ausente: ' + nome);
  return sh;
}

function ler_(nome) {
  const sh = aba_(nome);
  const vals = sh.getDataRange().getValues();
  const headers = (vals.shift() || []).map(h => String(h).trim());
  const rows = vals.map((r, i) => {
    const o = { _linha: i + 2 };
    headers.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  }).filter(o => headers.some(h => h && o[h] !== ''));
  return { sh, headers, rows };
}

function anexar_(nome, obj) {
  const sh = aba_(nome);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  sh.appendRow(headers.map(h => (obj[h] === undefined || obj[h] === null) ? '' : obj[h]));
}

function atualizarCampos_(t, linha, campos) {
  Object.keys(campos).forEach(k => {
    const c = t.headers.indexOf(k);
    if (c < 0) throw new Error('Coluna ausente: ' + k);
    t.sh.getRange(linha, c + 1).setValue(campos[k]);
  });
}

function registrarEvento_(protocolo, idFuncionario, acao, responsavel, obs) {
  try {
    anexar_('HISTORICO', {
      ID_EVENTO: Utilities.getUuid(), PROTOCOLO: protocolo || '', ID_FUNCIONARIO: idFuncionario || '',
      ACAO: acao, DATA_HORA: agora_(), RESPONSAVEL: responsavel || '', OBSERVACAO: limpar_(obs).slice(0, 500)
    });
  } catch (e) {
    console.error('Falha ao registrar evento ' + acao);
  }
}

/* ---------- Utilitários ---------- */

function texto_(v) {
  if (v instanceof Date) return formatar_(v);
  return String(v === null || v === undefined ? '' : v).trim();
}

function limpar_(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .trim();
}

function so_(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }
function sim_(v) { return /^(sim|s|true|1|x)$/i.test(texto_(v)); }
function ativo_(f) { return texto_(f.STATUS).toUpperCase() === 'ATIVO'; }
function norm_(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function normMatricula_(v) { return texto_(v).replace(/\s/g, '').slice(0, 20); }
function normCodigo_(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16); }
function formatar_(d) { return Utilities.formatDate(d, CFG.FUSO, 'yyyy-MM-dd HH:mm:ss'); }
function agora_() { return formatar_(new Date()); }
function formatarCodigo_(c) { return c.slice(0, 4) + '-' + c.slice(4); }
function novoIdFuncionario_() { return 'F' + aleatorio_(9); }
function maisRecente_(rows) { return ordenarDesc_(rows)[0] || null; }
function ordenarDesc_(rows) { return rows.slice().sort((a, b) => texto_(b.DATA_ENVIO).localeCompare(texto_(a.DATA_ENVIO)) || b._linha - a._linha); }

/* ---------- Administração pela planilha (menu) ---------- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Vegas RH')
    .addItem('1. Configurar estrutura', 'configurarEstrutura')
    .addItem('2. Criar ou redefinir usuário do RH', 'menuCriarAdmin')
    .addItem('3. Gerar códigos para quem não tem', 'menuGerarCodigos')
    .addSeparator()
    .addItem('Limpar fotos fora da retenção e órfãs', 'limparFotosAntigas')
    .addToUi();
}

function configurarEstrutura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('PEPPER')) props.setProperty('PEPPER', (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''));

  Object.keys(ABAS).forEach(nome => {
    const cab = ABAS[nome];
    const sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    const atual = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()).filter(Boolean) : [];
    const faltam = cab.filter(h => atual.indexOf(h) < 0);
    if (faltam.length) sh.getRange(1, atual.length + 1, 1, faltam.length).setValues([faltam]);
    const total = atual.length + faltam.length;
    sh.getRange(1, 1, sh.getMaxRows(), total).setNumberFormat('@');
    sh.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#171A20').setFontColor('#C7CBD1');
    sh.setFrozenRows(1);
  });

  const opc = ss.getSheetByName('OPCOES_UNIFORME');
  if (opc.getLastRow() < 2) opc.getRange(2, 1, OPCOES_PADRAO.length, OPCOES_PADRAO[0].length).setValues(OPCOES_PADRAO);

  let pastaId = props.getProperty('FOLDER_ID');
  try { if (pastaId) DriveApp.getFolderById(pastaId); } catch (_) { pastaId = null; }
  if (!pastaId) {
    const pasta = DriveApp.createFolder(CFG.PASTA_FOTOS);
    props.setProperty('FOLDER_ID', pasta.getId());
  }

  preencherIdsFaltantes_();
  SpreadsheetApp.getUi().alert('Estrutura pronta.\n\nPasta de fotos: ' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl() +
    '\n\nPróximo passo: Vegas RH > Criar ou redefinir usuário do RH.');
}

function preencherIdsFaltantes_() {
  const t = ler_('FUNCIONARIOS');
  if (!t.rows.length) return;
  const cId = t.headers.indexOf('ID_FUNCIONARIO');
  const cData = t.headers.indexOf('DATA_CADASTRO');
  const n = t.sh.getLastRow() - 1;
  const ids = t.sh.getRange(2, cId + 1, n, 1).getValues();
  const datas = t.sh.getRange(2, cData + 1, n, 1).getValues();
  const usados = new Set(ids.map(v => texto_(v[0])).filter(Boolean));
  t.rows.forEach(r => {
    const i = r._linha - 2;
    if (!texto_(ids[i][0])) {
      let novo;
      do { novo = novoIdFuncionario_(); } while (usados.has(novo));
      usados.add(novo);
      ids[i][0] = novo;
    }
    if (!texto_(datas[i][0])) datas[i][0] = agora_();
  });
  t.sh.getRange(2, cId + 1, n, 1).setValues(ids);
  t.sh.getRange(2, cData + 1, n, 1).setValues(datas);
}

function menuCriarAdmin() {
  const ui = SpreadsheetApp.getUi();
  const perguntar = texto => {
    const r = ui.prompt('Usuário do RH', texto, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) throw new Error('cancelado');
    return r.getResponseText().trim();
  };
  try {
    const usuario = perguntar('Login (ex.: maria.dp). Letras minúsculas, números, ponto, hífen ou _:').toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) return ui.alert('Login inválido.');
    const nome = perguntar('Nome completo:');
    const perfil = perguntar('Perfil: GESTOR, ANALISTA ou LEITURA').toUpperCase();
    if (!PERMISSOES[perfil]) return ui.alert('Perfil inválido.');
    const senha = perguntar('Senha com no mínimo 10 caracteres. Ela não fica gravada em lugar nenhum:');
    if (senha.length < 10) return ui.alert('Senha curta demais.');

    const t = ler_('ADMINS');
    const existente = t.rows.find(r => texto_(r.USUARIO).toLowerCase() === usuario);
    const dados = { USUARIO: usuario, NOME: limpar_(nome), PERFIL: perfil, ATIVO: 'SIM', HASH_SENHA: gerarHash_(senha) };
    if (existente) atualizarCampos_(t, existente._linha, dados);
    else anexar_('ADMINS', dados);
    limparFalhas_('a:' + usuario);
    registrarEvento_('', '', existente ? 'ADMIN_ATUALIZADO' : 'ADMIN_CRIADO', Session.getEffectiveUser().getEmail() || 'editor', usuario + ' (' + perfil + ')');
    ui.alert('Usuário ' + usuario + ' salvo com perfil ' + perfil + '.');
  } catch (e) {
    if (e.message !== 'cancelado') throw e;
  }
}

function menuGerarCodigos() {
  const ui = SpreadsheetApp.getUi();
  preencherIdsFaltantes_();
  const t = ler_('FUNCIONARIOS');
  const alvos = t.rows.filter(r => ativo_(r) && texto_(r.MATRICULA) && !texto_(r.HASH_CREDENCIAL));
  if (!alvos.length) return ui.alert('Nenhum funcionário ATIVO sem código.');
  if (ui.alert('Gerar código de acesso para ' + alvos.length + ' funcionário(s)?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cH = t.headers.indexOf('HASH_CREDENCIAL');
    const cE = t.headers.indexOf('CODIGO_EXPIRA_EM');
    const n = t.sh.getLastRow() - 1;
    const hashes = t.sh.getRange(2, cH + 1, n, 1).getValues();
    const expiras = t.sh.getRange(2, cE + 1, n, 1).getValues();
    const expira = formatar_(new Date(Date.now() + CFG.CODIGO_VALIDADE_DIAS * 864e5));
    const lista = [];
    alvos.forEach(r => {
      const codigo = aleatorio_(CFG.CODIGO_TAMANHO);
      hashes[r._linha - 2][0] = gerarHash_(codigo);
      expiras[r._linha - 2][0] = expira;
      lista.push([texto_(r.MATRICULA), texto_(r.NOME_COMPLETO), texto_(r.UNIDADE), formatarCodigo_(codigo), expira]);
    });
    t.sh.getRange(2, cH + 1, n, 1).setValues(hashes);
    t.sh.getRange(2, cE + 1, n, 1).setValues(expiras);
    SpreadsheetApp.flush();

    const arq = SpreadsheetApp.create('VEGAS_CODIGOS_ACESSO_' + Utilities.formatDate(new Date(), CFG.FUSO, 'yyyyMMdd-HHmm') + '_EXCLUIR_APOS_ENTREGA');
    const sh = arq.getSheets()[0];
    sh.getRange(1, 1, 1, 5).setValues([['MATRICULA', 'NOME', 'UNIDADE', 'CODIGO', 'VALIDO_ATE']]).setFontWeight('bold');
    sh.getRange(2, 1, lista.length, 5).setNumberFormat('@').setValues(lista);
    registrarEvento_('', '', 'CODIGOS_GERADOS_LOTE', Session.getEffectiveUser().getEmail() || 'editor', lista.length + ' código(s)');
    ui.alert('Códigos gerados: ' + lista.length + '.\n\nArquivo privado no seu Drive:\n' + arq.getUrl() +
      '\n\nEntregue individualmente e EXCLUA esse arquivo (e esvazie a lixeira) após a distribuição.');
  } finally {
    lock.releaseLock();
  }
}

function limparFotosAntigas() {
  const t = ler_('ATUALIZACOES');
  const protegidos = new Set();
  const porFunc = {};
  t.rows.forEach(r => { const id = texto_(r.ID_FUNCIONARIO); (porFunc[id] = porFunc[id] || []).push(r); });
  Object.keys(porFunc).forEach(id => {
    const lst = ordenarDesc_(porFunc[id]);
    const ultimaFoto = lst.find(r => texto_(r.FOTO_FILE_ID));
    const aprovada = lst.find(r => texto_(r.STATUS_ANALISE) === STATUS.APROVADA && texto_(r.FOTO_FILE_ID));
    [ultimaFoto, aprovada].forEach(r => { if (r) protegidos.add(texto_(r.FOTO_FILE_ID)); });
    lst.filter(r => [STATUS.PENDENTE, STATUS.EM_ANALISE].indexOf(texto_(r.STATUS_ANALISE)) >= 0)
      .forEach(r => { if (texto_(r.FOTO_FILE_ID)) protegidos.add(texto_(r.FOTO_FILE_ID)); });
  });
  const referenciados = new Set(t.rows.map(r => texto_(r.FOTO_FILE_ID)).filter(Boolean));
  const limiteRetencao = Date.now() - CFG.RETENCAO_FOTOS_DIAS * 864e5;
  const limiteOrfa = Date.now() - 864e5;
  const excluidas = new Set();
  let orfas = 0;

  const percorrer = pasta => {
    const arquivos = pasta.getFiles();
    while (arquivos.hasNext()) {
      const f = arquivos.next();
      const id = f.getId();
      const criado = f.getDateCreated().getTime();
      if (!referenciados.has(id)) {
        if (criado < limiteOrfa) { f.setTrashed(true); orfas++; }
      } else if (!protegidos.has(id) && criado < limiteRetencao) {
        f.setTrashed(true);
        excluidas.add(id);
      }
    }
  };
  const raiz = DriveApp.getFolderById(prop_('FOLDER_ID'));
  percorrer(raiz);
  const subpastas = raiz.getFolders();
  while (subpastas.hasNext()) percorrer(subpastas.next());

  if (excluidas.size) {
    const c = t.headers.indexOf('FOTO_URL_RESTRITA');
    const marca = 'EXCLUIDA_RETENCAO ' + agora_();
    t.rows.forEach(r => { if (excluidas.has(texto_(r.FOTO_FILE_ID))) t.sh.getRange(r._linha, c + 1).setValue(marca); });
  }
  registrarEvento_('', '', 'LIMPEZA_FOTOS', 'sistema', 'retenção: ' + excluidas.size + ' | órfãs: ' + orfas);
  try { SpreadsheetApp.getUi().alert('Fotos removidas por retenção: ' + excluidas.size + '\nArquivos órfãos removidos: ' + orfas); } catch (_) { }
}
