// ============================================================
// Mocho do Diabo MC — Painel Oficial
// Lógica de abas, autenticação de tesoureiro, tesouraria e
// calculadora de gasolina.
// ============================================================

// ---------- 1. Configuração do Supabase ----------
// Troque pelos dados do SEU projeto em supabase.com > Project Settings > API
const SUPABASE_URL = 'https://uykyuubqlegodmmazham.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1Q0SVm0_H7Qtlg51YQTjSA_TgjgANYn'; // chave pública (anon) — segura para expor no front-end

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Senha do tesoureiro — troque para a senha que preferir.
// Isto é apenas uma trava de interface: quem edita dados de verdade
// deve ser controlado por Row Level Security no Supabase (veja o README).
const SENHA_TESOUREIRO = "metronkg116647";
let isAdmin = false;

const VALOR_MENSALIDADE = 50; // ajuste se a mensalidade do clube mudar

document.addEventListener('DOMContentLoaded', () => {
  carregarDados();
});

// ---------- Navegação por abas ----------
function openTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

// ---------- Login do tesoureiro ----------
function loginAdmin() {
  const pinField = document.getElementById('admin-pin');
  const pin = pinField.value;

  if (pin === SENHA_TESOUREIRO) {
    isAdmin = true;
    document.getElementById('admin-badge').classList.remove('hidden');
    pinField.classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    carregarDados();
  } else {
    alert('Senha incorreta!');
  }
  pinField.value = '';
}

// ---------- Carregar dados da tesouraria ----------
async function carregarDados() {
  await Promise.all([carregarMembros(), carregarSangrias()]);
}

async function carregarMembros() {
  const { data: membros, error } = await db.from('membros').select('*').order('nome');
  const lista = document.getElementById('lista-membros');
  lista.innerHTML = '';

  if (error) {
    lista.innerHTML = '<li>Não foi possível carregar os membros.</li>';
    atualizarSaldo(0);
    return;
  }

  let totalMensalidades = 0;

  (membros || []).forEach(m => {
    if (m.pago) totalMensalidades += VALOR_MENSALIDADE;

    const li = document.createElement('li');

    const nomeSpan = document.createElement('span');
    nomeSpan.textContent = m.nome;
    li.appendChild(nomeSpan);

    if (isAdmin) {
      const acoes = document.createElement('div');
      acoes.className = 'item-acoes';

      const btn = document.createElement('button');
      btn.className = m.pago ? 'btn-pago' : 'btn-pendente';
      btn.textContent = m.pago ? '✓ Pago' : '✗ Pendente';
      btn.onclick = () => togglePagamento(m.id, m.pago);
      acoes.appendChild(btn);

      const btnRemover = document.createElement('button');
      btnRemover.className = 'btn-remover';
      btnRemover.textContent = '✕';
      btnRemover.title = 'Remover membro';
      btnRemover.onclick = () => removerMembro(m.id, m.nome);
      acoes.appendChild(btnRemover);

      li.appendChild(acoes);
    } else {
      const statusSpan = document.createElement('span');
      statusSpan.style.color = m.pago ? 'var(--paid)' : 'var(--blood-bright)';
      statusSpan.style.fontWeight = '600';
      statusSpan.textContent = m.pago ? 'Pago' : 'Pendente';
      li.appendChild(statusSpan);
    }

    lista.appendChild(li);
  });

  window.__totalMensalidades = totalMensalidades;
  recalcularSaldo();
}

async function carregarSangrias() {
  const { data: sangrias, error } = await db.from('sangrias').select('*').order('created_at', { ascending: false });
  const lista = document.getElementById('lista-sangrias');
  lista.innerHTML = '';

  if (error) {
    lista.innerHTML = '<li>Não foi possível carregar as sangrias.</li>';
    window.__totalSangrias = 0;
    recalcularSaldo();
    return;
  }

  let totalSangrias = 0;

  (sangrias || []).forEach(s => {
    totalSangrias += Number(s.valor);

    const li = document.createElement('li');
    const wrap = document.createElement('div');

    const desc = document.createElement('strong');
    desc.textContent = s.descricao;
    wrap.appendChild(desc);

    const valorSpan = document.createElement('span');
    valorSpan.style.color = '#e07b76';
    valorSpan.textContent = ` — R$ ${Number(s.valor).toFixed(2)}`;
    wrap.appendChild(valorSpan);

    if (s.comprovante_url) {
      wrap.appendChild(document.createElement('br'));
      const link = document.createElement('a');
      link.href = s.comprovante_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'comprovante-link';
      link.textContent = '📎 Ver comprovante';
      wrap.appendChild(link);
    }

    li.appendChild(wrap);
    lista.appendChild(li);
  });

  window.__totalSangrias = totalSangrias;
  recalcularSaldo();
}

function recalcularSaldo() {
  const totalMensalidades = window.__totalMensalidades || 0;
  const totalSangrias = window.__totalSangrias || 0;
  atualizarSaldo(totalMensalidades - totalSangrias);
}

function atualizarSaldo(valor) {
  document.getElementById('total-caixa').innerText =
    `R$ ${valor.toFixed(2)}`;
}

// ---------- Alternar status de pagamento ----------
async function togglePagamento(id, statusAtual) {
  if (!isAdmin) return;
  await db.from('membros').update({ pago: !statusAtual }).eq('id', id);
  carregarMembros();
}

// ---------- Remover membro ----------
async function removerMembro(id, nome) {
  if (!isAdmin) return;
  const confirmar = confirm(`Remover ${nome} da lista de membros?`);
  if (!confirmar) return;

  const { error } = await db.from('membros').delete().eq('id', id);
  if (error) {
    alert('Não foi possível remover o membro.');
    return;
  }
  carregarMembros();
}

// ---------- Adicionar novo membro ----------
async function adicionarMembro() {
  if (!isAdmin) return;
  const campo = document.getElementById('novo-membro');
  const nome = campo.value.trim();
  if (!nome) return;

  await db.from('membros').insert([{ nome, pago: false }]);
  campo.value = '';
  carregarMembros();
}

// ---------- Adicionar sangria + comprovante ----------
async function adicionarSangria() {
  if (!isAdmin) return;

  const descCampo = document.getElementById('sangria-desc');
  const valorCampo = document.getElementById('sangria-valor');
  const fileInput = document.getElementById('sangria-foto');

  const descricao = descCampo.value.trim();
  const valor = valorCampo.value;
  const file = fileInput.files[0];

  if (!descricao || !valor) {
    alert('Preencha a descrição e o valor!');
    return;
  }

  let comprovante_url = null;

  if (file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await db.storage.from('comprovantes').upload(fileName, file);

    if (uploadError) {
      alert('Erro ao enviar a imagem do comprovante!');
    } else {
      const { data: urlData } = db.storage.from('comprovantes').getPublicUrl(fileName);
      comprovante_url = urlData.publicUrl;
    }
  }

  await db.from('sangrias').insert([{ descricao, valor: parseFloat(valor), comprovante_url }]);

  descCampo.value = '';
  valorCampo.value = '';
  fileInput.value = '';

  carregarSangrias();
}

// ---------- Calculadora de combustível ----------
function toggleCustomConsumo() {
  const select = document.getElementById('moto-select').value;
  const customBox = document.getElementById('custom-consumo-box');
  customBox.classList.toggle('hidden', select !== 'custom');
}

function calcularGasto() {
  const preco = parseFloat(document.getElementById('preco-gasolina').value);
  const km = parseFloat(document.getElementById('distancia-km').value);
  const select = document.getElementById('moto-select').value;

  if (!preco || !km) {
    alert('Informe o preço do litro e a distância!');
    return;
  }

  let kmLSuave, kmLIntenso;

  if (select === 'custom') {
    kmLSuave = parseFloat(document.getElementById('custom-suave').value);
    kmLIntenso = parseFloat(document.getElementById('custom-intenso').value);
    if (!kmLSuave || !kmLIntenso) {
      alert('Informe o consumo suave e o intenso da sua moto!');
      return;
    }
  } else {
    const [suave, intenso] = select.split('|');
    kmLSuave = parseFloat(suave);
    kmLIntenso = parseFloat(intenso);
  }

  const litrosSuave = km / kmLSuave;
  const gastoSuave = litrosSuave * preco;

  const litrosIntenso = km / kmLIntenso;
  const gastoIntenso = litrosIntenso * preco;

  document.getElementById('res-suave').innerText =
    `${litrosSuave.toFixed(1)} L · R$ ${gastoSuave.toFixed(2)}`;
  document.getElementById('res-intenso').innerText =
    `${litrosIntenso.toFixed(1)} L · R$ ${gastoIntenso.toFixed(2)}`;

  document.getElementById('resultado-calculo').classList.remove('hidden');
}
