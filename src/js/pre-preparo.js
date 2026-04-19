// src/js/pre-preparo.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("🚀 pre-preparo.js carregado!");

let insumosDisponiveis = [];
let prePreparosLista = [];

function mostrarMensagem(texto, tipo) {
  const msg = document.getElementById('mensagem');
  if (!msg) return;
  msg.textContent = texto;
  msg.style.backgroundColor = tipo === 'sucesso' ? '#28a745' : '#dc3545';
  msg.style.color = 'white';
  msg.style.display = 'block';
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);
}

// Carregar pré-preparos existentes
async function carregarPrePreparos() {
  const setor = document.getElementById('setorPre')?.value;
  if (!setor) return;
  
  try {
    const q = query(collection(db, "prePreparos"), where("setor", "==", setor));
    const snapshot = await getDocs(q);
    
    prePreparosLista = [];
    snapshot.forEach(doc => {
      prePreparosLista.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    atualizarTabelaPrePreparos();
  } catch (error) {
    console.error("Erro ao carregar pré-preparos:", error);
  }
}

// Atualizar tabela de pré-preparos existentes
function atualizarTabelaPrePreparos() {
  const tbody = document.getElementById('prePreparosLista');
  if (!tbody) return;
  
  if (prePreparosLista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum pré-preparo cadastrado</td</tr>';
    return;
  }
  
  tbody.innerHTML = '';
  prePreparosLista.forEach(pre => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${pre.nome}</strong></td>
      <td>${pre.classificacao || '-'}</td>
      <td>${pre.rendimento} ${pre.unidadeRendimento || 'UND'}</td>
      <td class="valor">R$ ${(pre.custoPorPorcao || 0).toFixed(2)}</td>
      <td>
        <button class="btn-editar" data-id="${pre.id}">✏️ Editar</button>
        <button class="btn-excluir" data-id="${pre.id}">🗑️ Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Adicionar event listeners aos botões
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.removeEventListener('click', () => {});
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      editarPrePreparo(btn.getAttribute('data-id'));
    });
  });
  
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.removeEventListener('click', () => {});
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      excluirPrePreparo(btn.getAttribute('data-id'));
    });
  });
}

// FUNÇÃO DE EXCLUSÃO - VERSÃO SIMPLIFICADA E ROBUSTA
window.excluirPrePreparo = excluirPrePreparo;
async function excluirPrePreparo(id) {
  console.log("🗑️ EXCLUIR chamado com ID:", id);
  
  if (!confirm("⚠️ Tem certeza? Isso excluirá o pré-preparo e o insumo correspondente!")) {
    return;
  }
  
  try {
    // 1. Buscar o pré-preparo pelo ID
    const preDocRef = doc(db, "prePreparos", id);
    const preDocSnap = await getDoc(preDocRef);
    
    if (!preDocSnap.exists()) {
      mostrarMensagem("Pré-preparo não encontrado!", "erro");
      return;
    }
    
    const prePreparo = preDocSnap.data();
    const nomePre = prePreparo.nome;
    const setorPre = prePreparo.setor;
    
    console.log("📦 Pré-preparo encontrado:", nomePre);
    
    // 2. Buscar e excluir insumos com o mesmo nome e setor
    const insumosQuery = query(
      collection(db, "insumos"),
      where("nome", "==", nomePre),
      where("setor", "==", setorPre)
    );
    const insumosSnapshot = await getDocs(insumosQuery);
    
    console.log(`🔍 Encontrados ${insumosSnapshot.size} insumos com nome "${nomePre}"`);
    
    for (const insumoDoc of insumosSnapshot.docs) {
      await deleteDoc(doc(db, "insumos", insumoDoc.id));
      console.log(`✅ Insumo "${nomePre}" excluído`);
    }
    
    // 3. Excluir o pré-preparo
    await deleteDoc(doc(db, "prePreparos", id));
    console.log(`✅ Pré-preparo "${nomePre}" excluído`);
    
    mostrarMensagem(`✅ "${nomePre}" e seu insumo foram excluídos!`, "sucesso");
    
    // 4. Recarregar as listas
    await carregarPrePreparos();
    await carregarInsumosDisponiveis();
    
  } catch (error) {
    console.error("❌ Erro ao excluir:", error);
    mostrarMensagem("Erro ao excluir: " + error.message, "erro");
  }
}

// Carregar insumos disponíveis
async function carregarInsumosDisponiveis() {
  try {
    const setor = document.getElementById('setorPre')?.value;
    if (!setor) return;
    
    const q = query(collection(db, "insumos"), where("setor", "==", setor));
    const snapshot = await getDocs(q);
    
    insumosDisponiveis = [];
    snapshot.forEach(doc => {
      insumosDisponiveis.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    atualizarSelectsInsumos();
  } catch (error) {
    console.error("Erro:", error);
  }
}

function atualizarSelectsInsumos() {
  const selects = document.querySelectorAll('#insumosContainer .insumo-select');
  selects.forEach(select => {
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione um insumo</option>';
    
    insumosDisponiveis.forEach(insumo => {
      const option = document.createElement('option');
      option.value = insumo.id;
      option.textContent = `${insumo.nome} (${insumo.unidade} - R$ ${(insumo.valorCompra || 0).toFixed(2)})`;
      option.setAttribute('data-nome', insumo.nome);
      option.setAttribute('data-unidade', insumo.unidade);
      option.setAttribute('data-valor-porcao', insumo.valorPorPorcao || 0);
      option.setAttribute('data-valor-compra', insumo.valorCompra || 0);
      select.appendChild(option);
    });
    
    if (valorAtual && Array.from(select.options).some(opt => opt.value === valorAtual)) {
      select.value = valorAtual;
    }
  });
}

function adicionarLinhaInsumo() {
  const container = document.getElementById('insumosContainer');
  if (!container) return;
  
  const novaLinha = document.createElement('div');
  novaLinha.className = 'insumo-item';
  novaLinha.innerHTML = `
    <select class="insumo-select" style="width: 100%;">
      <option value="">Selecione um insumo</option>
    </select>
    <input type="number" class="insumo-quantidade" placeholder="Quantidade" step="0.001" value="0">
    <select class="insumo-unidade">
      <option value="g">g</option>
      <option value="kg">kg</option>
      <option value="ml">ml</option>
      <option value="L">L</option>
      <option value="UND">UND</option>
    </select>
    <input type="text" class="insumo-custo" readonly placeholder="Custo" style="background:#f0f0f0;">
    <button type="button" class="btn-remover" onclick="removerInsumo(this)">🗑️</button>
  `;
  container.appendChild(novaLinha);
  
  const select = novaLinha.querySelector('.insumo-select');
  insumosDisponiveis.forEach(insumo => {
    const option = document.createElement('option');
    option.value = insumo.id;
    option.textContent = `${insumo.nome} (${insumo.unidade} - R$ ${(insumo.valorCompra || 0).toFixed(2)})`;
    option.setAttribute('data-nome', insumo.nome);
    option.setAttribute('data-unidade', insumo.unidade);
    option.setAttribute('data-valor-porcao', insumo.valorPorPorcao || 0);
    option.setAttribute('data-valor-compra', insumo.valorCompra || 0);
    select.appendChild(option);
  });
  
  select.addEventListener('change', () => calcularCustoInsumo(select));
  const quantidade = novaLinha.querySelector('.insumo-quantidade');
  quantidade.addEventListener('input', () => calcularCustoInsumo(select));
}

window.removerInsumo = function(botao) {
  const container = document.getElementById('insumosContainer');
  if (container.children.length > 1) {
    botao.closest('.insumo-item').remove();
    calcularCustoTotal();
  } else {
    mostrarMensagem("Mantenha pelo menos um insumo!", "erro");
  }
};

function calcularCustoInsumo(select) {
  const item = select.closest('.insumo-item');
  const quantidade = parseFloat(item.querySelector('.insumo-quantidade').value) || 0;
  const selectedOption = select.options[select.selectedIndex];
  const valorPorPorcao = parseFloat(selectedOption?.getAttribute('data-valor-porcao')) || 0;
  const valorCompra = parseFloat(selectedOption?.getAttribute('data-valor-compra')) || 0;
  
  let custo = 0;
  const unidadeInsumo = selectedOption?.getAttribute('data-unidade') || 'KG';
  
  if (unidadeInsumo === 'KG' || unidadeInsumo === 'L') {
    custo = quantidade * valorCompra;
  } else if (unidadeInsumo === 'g' || unidadeInsumo === 'ml') {
    custo = (quantidade / 1000) * valorCompra;
  } else {
    custo = quantidade * valorPorPorcao;
  }
  
  const custoInput = item.querySelector('.insumo-custo');
  custoInput.value = `R$ ${custo.toFixed(2)}`;
  
  calcularCustoTotal();
}

function calcularCustoTotal() {
  let custoTotal = 0;
  
  document.querySelectorAll('#insumosContainer .insumo-item').forEach(item => {
    const custoText = item.querySelector('.insumo-custo').value;
    const custo = parseFloat(custoText.replace('R$ ', '')) || 0;
    custoTotal += custo;
  });
  
  const rendimento = parseFloat(document.getElementById('rendimento')?.value) || 1;
  const custoPorPorcao = custoTotal / rendimento;
  
  const custoTotalEl = document.getElementById('custoTotal');
  const custoPorPorcaoEl = document.getElementById('custoPorPorcao');
  
  if (custoTotalEl) custoTotalEl.innerHTML = `R$ ${custoTotal.toFixed(2)}`;
  if (custoPorPorcaoEl) custoPorPorcaoEl.innerHTML = `R$ ${custoPorPorcao.toFixed(2)}`;
  
  return { custoTotal, custoPorPorcao };
}

function coletarInsumos() {
  const insumos = [];
  
  document.querySelectorAll('#insumosContainer .insumo-item').forEach(item => {
    const select = item.querySelector('.insumo-select');
    const selectedOption = select.options[select.selectedIndex];
    const quantidade = parseFloat(item.querySelector('.insumo-quantidade').value) || 0;
    const custoText = item.querySelector('.insumo-custo').value;
    
    if (select.value && quantidade > 0) {
      insumos.push({
        insumoId: select.value,
        nome: selectedOption?.getAttribute('data-nome') || '',
        quantidade: quantidade,
        unidade: item.querySelector('.insumo-unidade').value,
        custo: parseFloat(custoText.replace('R$ ', '')) || 0
      });
    }
  });
  
  return insumos;
}

async function salvarPrePreparo(event) {
  event.preventDefault();
  
  const prePreparoId = document.getElementById('prePreparoId')?.value;
  const nome = document.getElementById('nomePre')?.value.toUpperCase().trim();
  const setor = document.getElementById('setorPre')?.value;
  const classificacao = document.getElementById('classificacao')?.value;
  const rendimento = parseFloat(document.getElementById('rendimento')?.value);
  const unidadeRendimento = document.getElementById('unidadeRendimento')?.value;
  const insumos = coletarInsumos();
  const { custoTotal, custoPorPorcao } = calcularCustoTotal();
  
  if (!nome || !setor) {
    mostrarMensagem("Preencha nome e setor!", "erro");
    return;
  }
  
  if (insumos.length === 0) {
    mostrarMensagem("Adicione pelo menos um insumo!", "erro");
    return;
  }
  
  try {
    if (prePreparoId) {
      await updateDoc(doc(db, "prePreparos", prePreparoId), {
        nome: nome,
        setor: setor,
        classificacao: classificacao,
        rendimento: rendimento,
        unidadeRendimento: unidadeRendimento,
        custoTotal: custoTotal,
        custoPorPorcao: custoPorPorcao,
        insumos: insumos,
        dataAtualizacao: new Date().toISOString().split('T')[0]
      });
      
      const insumosQuery = query(collection(db, "insumos"), where("prePreparoId", "==", prePreparoId));
      const insumosSnapshot = await getDocs(insumosQuery);
      
      if (!insumosSnapshot.empty) {
        await updateDoc(doc(db, "insumos", insumosSnapshot.docs[0].id), {
          nome: nome,
          valorCompra: custoPorPorcao,
          valorPorPorcao: custoPorPorcao
        });
      }
      
      mostrarMensagem(`✅ Pré-preparo "${nome}" atualizado!`, "sucesso");
    } else {
      const prePreparoRef = await addDoc(collection(db, "prePreparos"), {
        nome: nome,
        setor: setor,
        classificacao: classificacao,
        rendimento: rendimento,
        unidadeRendimento: unidadeRendimento,
        custoTotal: custoTotal,
        custoPorPorcao: custoPorPorcao,
        insumos: insumos,
        dataCriacao: new Date().toISOString().split('T')[0]
      });
      
      await addDoc(collection(db, "insumos"), {
        setor: setor,
        nome: nome,
        unidade: unidadeRendimento,
        fatorRendimento: 100,
        valorCompra: custoPorPorcao,
        valorPorPorcao: custoPorPorcao,
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
        isPrePreparo: true,
        prePreparoId: prePreparoRef.id
      });
      
      mostrarMensagem(`✅ Pré-preparo "${nome}" salvo!`, "sucesso");
    }
    
    fecharModal();
    carregarPrePreparos();
    carregarInsumosDisponiveis();
    
  } catch (error) {
    console.error("Erro:", error);
    mostrarMensagem("Erro ao salvar pré-preparo!", "erro");
  }
}

function fecharModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
  
  const form = document.getElementById('preForm');
  if (form) form.reset();
  
  const container = document.getElementById('insumosContainer');
  if (container) {
    container.innerHTML = '';
    adicionarLinhaInsumo();
  }
  
  const prePreparoId = document.getElementById('prePreparoId');
  if (prePreparoId) prePreparoId.value = '';
  
  const modalTitulo = document.getElementById('modalTitulo');
  if (modalTitulo) modalTitulo.innerHTML = '➕ Novo Pré-Preparo';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 DOM carregado, inicializando...");
  
  const setorSelect = document.getElementById('setorPre');
  if (setorSelect) {
    setorSelect.addEventListener('change', () => {
      carregarInsumosDisponiveis();
      carregarPrePreparos();
    });
  }
  
  const btnAdd = document.getElementById('btnAddInsumo');
  if (btnAdd) btnAdd.addEventListener('click', adicionarLinhaInsumo);
  
  const form = document.getElementById('preForm');
  if (form) form.addEventListener('submit', salvarPrePreparo);
  
  const rendimento = document.getElementById('rendimento');
  if (rendimento) rendimento.addEventListener('input', () => calcularCustoTotal());
  
  const btnAbrirModal = document.getElementById('btnAbrirModal');
  if (btnAbrirModal) {
    btnAbrirModal.onclick = () => {
      const modal = document.getElementById('modal');
      if (modal) modal.style.display = 'flex';
      
      const formPre = document.getElementById('preForm');
      if (formPre) formPre.reset();
      
      const container = document.getElementById('insumosContainer');
      if (container) {
        container.innerHTML = '';
        adicionarLinhaInsumo();
      }
      
      const prePreparoId = document.getElementById('prePreparoId');
      if (prePreparoId) prePreparoId.value = '';
      
      const modalTitulo = document.getElementById('modalTitulo');
      if (modalTitulo) modalTitulo.innerHTML = '➕ Novo Pré-Preparo';
    };
  }
  
  const btnFecharModal = document.getElementById('btnFecharModal');
  if (btnFecharModal) btnFecharModal.onclick = fecharModal;
  
  window.onclick = (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) fecharModal();
  };
  
  setTimeout(() => {
    const selectInicial = document.querySelector('.insumo-select');
    if (selectInicial) {
      selectInicial.addEventListener('change', () => calcularCustoInsumo(selectInicial));
      const quantidadeInicial = document.querySelector('.insumo-quantidade');
      if (quantidadeInicial) {
        quantidadeInicial.addEventListener('input', () => calcularCustoInsumo(selectInicial));
      }
    }
  }, 500);
});