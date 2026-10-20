# Vegas — Atualização Cadastral

Funcionário atualiza endereço, telefones, tamanhos de uniforme e selfie pelo celular. RH analisa, aprova ou devolve em um painel restrito.

```
GitHub Pages (index.html, style.css, script.js)
        │  POST text/plain (sem preflight CORS)
        ▼
Apps Script Web App (Code.gs)  ──►  Google Sheets  (FUNCIONARIOS, ATUALIZACOES, HISTORICO, ADMINS, OPCOES_UNIFORME)
                               └──►  Google Drive   (VEGAS_RH_FOTOS_CADASTRAIS/AAAA/FUNC_<id>_<data>.jpg)
```

## Modelo de segurança (leia antes de publicar)

| Ponto | Como foi resolvido |
|---|---|
| Identidade do funcionário | Matrícula + **código individual** de 8 caracteres gerado pelo RH. Guardado só como hash (SHA-256 iterado + salt por registro + pepper nas Propriedades do Script). Expira em 30 dias. |
| Força bruta | 5 erros por matrícula → bloqueio de 15 min. Bloqueios vão para o HISTORICO. |
| Sessão | Token aleatório de 64 hex no CacheService. 30 min (funcionário) / 60 min (RH), renovados a cada ação. Só fica na memória do navegador. |
| Quem é quem | O backend usa o `ID_FUNCIONARIO` da sessão. Nome e matrícula enviados pelo navegador são ignorados. |
| RH | Usuários na aba ADMINS com senha em hash e perfil (`GESTOR`, `ANALISTA`, `LEITURA`). Toda ação confere permissão e se o usuário continua `ATIVO`. |
| Fotos | Pasta privada; nenhum link público. O RH vê a selfie pelo painel (o backend devolve a imagem só para perfil autorizado e registra `FOTO_VISUALIZADA`). |
| Gravação | `LockService`, protocolo único conferido na planilha, idempotência por `requestId` (clique duplo ou internet caindo não geram dois protocolos), foto apagada se a gravação falhar. |
| Injeção | Validação repetida no servidor, remoção de caracteres de controle e de `= + - @` no início dos textos; o CSV exportado também é neutralizado. |

**Por que não login Google do funcionário:** vigilantes normalmente não têm conta corporativa, e um Web App aberto via GitHub Pages não recebe a identidade Google de quem acessa. Se toda a equipe tiver conta Workspace, dá para trocar por `Session.getActiveUser()` — mas aí o frontend precisa ser servido pelo próprio Apps Script.

## 1. Criar a planilha

1. Google Drive da conta do DP (não use conta pessoal) → **Novo → Planilhas Google** → nome `VEGAS_RH_ATUALIZACAO_CADASTRAL`.
2. Compartilhe só com quem administra o sistema. Analistas do RH **não precisam** de acesso à planilha: eles usam o painel.

## 2. Abas e cabeçalhos

Não crie à mão. Depois do passo 4, rode **Vegas RH → 1. Configurar estrutura**: ele cria as 5 abas com os cabeçalhos, formata tudo como texto (preserva zero à esquerda de CEP e matrícula) e preenche `OPCOES_UNIFORME` com os tamanhos padrão.

Cadastro-base em **FUNCIONARIOS** (cole do sistema de folha):

| Coluna | Preenchimento |
|---|---|
| ID_FUNCIONARIO | deixe vazio — o sistema gera |
| MATRICULA | obrigatório |
| NOME_COMPLETO | obrigatório |
| STATUS | `ATIVO` libera o acesso; qualquer outro valor bloqueia |
| EMAIL_CORPORATIVO | opcional |
| HASH_CREDENCIAL | deixe vazio — o sistema gera |
| DATA_CADASTRO | deixe vazio — o sistema gera |
| UNIDADE | ex.: Volta Redonda, Niterói, Piraí (vira filtro no painel) |
| CODIGO_EXPIRA_EM | deixe vazio — o sistema gera |

Peças do uniforme em **OPCOES_UNIFORME** (o DP altera sem mexer no código):

| CHAVE | PECA | ATIVA | OBRIGATORIA | OPCOES |
|---|---|---|---|---|
| CAMISA | Camisa / camiseta | SIM | SIM | PP,P,M,G,GG,XGG,EG,EGG |
| COLETE | Colete | SIM | NAO | P,M,G,GG |

`CAMISA`, `CALCA`, `JAQUETA`, `BERMUDA` e `CALCADO` gravam em colunas próprias; qualquer outra chave (ex.: `COLETE`) vai em JSON na coluna `TAMANHOS_EXTRAS`. Peça não obrigatória ganha a opção "Não uso". Mudanças valem no próximo acesso do funcionário.

## 3. Pasta no Drive

Criada automaticamente pelo **Configurar estrutura** (`VEGAS_RH_FOTOS_CADASTRAIS`, com subpastas por ano). Não compartilhe a pasta e não gere links. Se já existir uma pasta que você queira usar, coloque o ID dela na propriedade `FOLDER_ID` antes de rodar.

## 4. IDs e configuração do Apps Script

1. Na planilha: **Extensões → Apps Script**. Apague o conteúdo e cole o `Code.gs`. Salve.
2. **Configurações do projeto** (engrenagem) → fuso horário `(GMT-03:00) São Paulo`.
3. Recarregue a planilha. Aparece o menu **Vegas RH**. Rode **1. Configurar estrutura** e autorize.
4. Confira em **Configurações do projeto → Propriedades do script**: `SPREADSHEET_ID`, `FOLDER_ID` e `PEPPER` devem existir.

> **Nunca altere nem apague o `PEPPER`.** Todos os códigos e senhas deixam de funcionar.

Parâmetros ajustáveis no topo do `Code.gs` (objeto `CFG`): validade do código, tentativas, bloqueio, tempo de sessão, foto obrigatória, tamanho máximo da foto e retenção.

## 5. Autenticação do RH e dos funcionários

**RH:** menu **Vegas RH → 2. Criar ou redefinir usuário do RH**. Informe login, nome, perfil e senha (mín. 10 caracteres). Para desativar alguém, troque `ATIVO` para `NAO` na aba ADMINS — vale na hora.

| Perfil | Pode |
|---|---|
| GESTOR | tudo, inclusive gerar códigos de funcionário |
| ANALISTA | ver, analisar, ver selfie, exportar CSV |
| LEITURA | só consultar a lista e os dados |

**Funcionários:**

- Em lote: **Vegas RH → 3. Gerar códigos para quem não tem**. Cria uma planilha privada `VEGAS_CODIGOS_ACESSO_..._EXCLUIR_APOS_ENTREGA` no seu Drive com matrícula, nome e código. Imprima/entregue individualmente e **exclua o arquivo e esvazie a lixeira** depois.
- Individual (perdeu ou expirou): painel do RH → "Código de acesso do funcionário" (perfil GESTOR). O código aparece uma única vez e o anterior para de funcionar.

## 6. Publicar como app da web

1. Apps Script → **Implantar → Nova implantação** → tipo **App da Web**.
2. **Executar como:** Eu (conta dona da planilha).
3. **Quem pode acessar:** **Qualquer pessoa**. (Não use "Qualquer pessoa com Conta do Google": o `fetch` do GitHub Pages falha.)
4. Copie a URL que termina em `/exec`.

Ao alterar o `Code.gs`: **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão**. Assim a URL continua a mesma. "Nova implantação" gera outra URL.

## 7. Permissões

- Escopos pedidos: Planilhas, Drive, Cache, Lock, Properties, Ui (menu). Todos rodam com a conta que publicou.
- Planilha e pasta de fotos: só a conta dona + administradores do sistema.
- Se for Google Workspace e a opção "Qualquer pessoa" não aparecer, o administrador do domínio bloqueou compartilhamento externo de apps; peça a liberação para esse projeto ou publique com uma conta autorizada.

## 8. Conectar o frontend

1. No `script.js`, troque `API_URL` pela URL `/exec`.
2. Coloque o logo oficial em `assets/logo-vegas.png` (PNG com fundo transparente). Sem o arquivo, o cabeçalho mostra o nome VEGAS em texto metálico.
3. Preencha no `index.html` os dois trechos entre colchetes do aviso de privacidade: prazo de retenção e contato do encarregado/DP.
4. Suba os 4 arquivos (+ pasta `assets`) num repositório e ative **Settings → Pages**.
5. Link do funcionário: `https://vegasvig.github.io/<repo>/`. Painel do RH: mesmo link com `#rh` no final.

A câmera só abre em HTTPS (GitHub Pages já é).

## 9. Roteiro de teste

Faça com 2–3 funcionários fictícios (`STATUS = ATIVO`, matrículas tipo `TESTE01`).

| # | Teste | Esperado |
|---|---|---|
| 1 | Abrir a URL `/exec` no navegador | JSON `{"ok":true,...}` |
| 2 | Login com código errado 5 vezes | 5ª tentativa bloqueia por 15 min; evento `BLOQUEIO_ACESSO` |
| 3 | Login correto, preencher tudo, CEP real | Endereço preenchido pelo ViaCEP, editável |
| 4 | Selfie pela câmera (Android e iPhone) e pela galeria | Prévia; arquivo ≤ ~700 KB |
| 5 | Enviar | Protocolo `VEGAS-CAD-AAAAMMDD-XXXXX`; linha em ATUALIZACOES como `PENDENTE`; foto em `VEGAS_RH_FOTOS_CADASTRAIS/2026` |
| 6 | Clicar duas vezes rápido em enviar | Um único protocolo |
| 7 | Entrar de novo com o mesmo funcionário | Tela "em análise", sem formulário |
| 8 | RH: abrir, ver selfie, devolver com observação | Status `DEVOLVIDA_PARA_CORRECAO`; eventos no HISTORICO |
| 9 | Funcionário entra de novo | Aviso com a observação; formulário pré-preenchido; opção de manter foto |
| 10 | Reenviar → RH aprova | Comparação destaca o que mudou; status `APROVADA` |
| 11 | Usuário `LEITURA` | Sem botões de análise, foto, exportação ou códigos — e o backend recusa se chamado direto |
| 12 | Deixar a sessão parada 31 min e continuar | Pede login de novo e retoma de onde parou |
| 13 | Imprimir comprovante | Só o comprovante sai na página |

Depois dos testes: apague as linhas de teste das abas, as fotos de teste e os funcionários fictícios.

## 10. Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| "O sistema ainda não foi configurado" | `API_URL` não trocada ou sem `/exec` | Cole a URL completa da implantação |
| "Sem conexão com o servidor" / erro CORS no console | Acesso não está como "Qualquer pessoa", ou URL `/dev` | Reimplante com "Qualquer pessoa" e use `/exec` |
| Mudança no `Code.gs` não aparece | Implantação antiga | Gerenciar implantações → Nova versão |
| `SPREADSHEET_ID ausente` | Configurar estrutura não rodou | Menu Vegas RH → 1 |
| Login sempre falha | `STATUS` diferente de `ATIVO`, código não gerado ou `PEPPER` alterado | Confira a linha; gere novo código |
| CEP/matrícula sem zero à esquerda | Coluna ficou como número | Rode Configurar estrutura de novo e recole os dados |
| Câmera não abre | Permissão negada ou navegador embutido (WhatsApp/Instagram) | Abrir no Chrome/Safari; ou usar "Escolher foto do aparelho" |
| "Muitos envios ao mesmo tempo" | Pico de acesso | Normal em massa; o funcionário tenta de novo |

## 11. Rotina e LGPD

- **Retenção de fotos:** menu **Limpar fotos fora da retenção e órfãs** (ou gatilho mensal em Acionadores → `limparFotosAntigas`). Mantém a foto mais recente e a última aprovada de cada funcionário; apaga as demais mais antigas que `RETENCAO_FOTOS_DIAS` e arquivos sem registro há mais de 1 dia. Ajuste o prazo com o encarregado de dados.
- **Base legal e aviso:** defina com o jurídico/encarregado (tipicamente execução de contrato de trabalho e obrigação legal). A selfie não é usada para biometria; se um dia for, exige avaliação específica.
- **Desligados:** troque `STATUS` para `INATIVO`. O acesso cai imediatamente.
- **Cadastro vigente:** é a atualização `APROVADA` mais recente de cada funcionário em ATUALIZACOES. O sistema não sobrescreve o cadastro da folha — a integração com a folha/sistema de uniformes é o próximo passo.
