// src/js/ficha-tecnica.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let insumosDisponiveis = [];
let prePreparosDisponiveis = [];
let todosItensDisponiveis = [];

function mostrarMensagem(texto, tipo) {
  const msg = document.getElementById('mensagem');
  msg.textContent = texto;
  msg.className = `mensagem ${tipo}`;
  msg.style.display = 'block';
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);
}

// Carregar categorias baseado no setor
async function carregarCategorias() {
  const setor = document.getElementById('setor').value;
  const categoriaSelect = document.getElementById('categoria');
  
  const categoriasPorSetor = {
    pizzaria: ['pizza', 'rodizio', 'macarrao'],
    restaurante: ['lanche', 'porcao', 'salgado', 'pf', 'marmita', 'omelete', 'nhoque', 'sobremesa', 'buteco'],
    padaria: ['pao', 'rosca', 'sonho']
  };
  
  const categorias = categoriasPorSetor[setor] || [];
  
  categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    categoriaSelect.appendChild(option);
  });
}

// Carregar insumos e pré-preparos do Firebase
async function carregarItensDisponiveis() {
  try {
    const setor = document.getElementById('setor').value;
    if (!setor) return;
    
    // Carregar insumos normais
    const insumosQuery = query(collection(db, "insumos"), where("setor", "==", setor));
    const insumosSnapshot = await getDocs(insumosQuery);
    
    insumosDisponiveis = [];
    insumosSnapshot.forEach(doc => {
      const data = doc.data();
      insumosDisponiveis.push({
        id: doc.id,
        ...data,
        tipo: 'insumo'
      });
    });
    
    // Carregar pré-preparos
    const preQuery = query(collection(db, "prePreparos"), where("setor", "==", setor));
    const preSnapshot = await getDocs(preQuery);
    
    prePreparosDisponiveis = [];
    preSnapshot.forEach(doc => {
      const data = doc.data();
      prePreparosDisponiveis.push({
        id: doc.id,
        nome: data.nome,
        unidade: data.unidadeRendimento || 'UND',
        valorCompra: data.custoPorPorcao || 0,
        valorPorPorcao: data.custoPorPorcao || 0,
        tipo: 'pre-preparo',
        isPrePreparo: true
      });
    });
    
    // Combinar ambos
    todosItensDisponiveis = [...insumosDisponiveis, ...prePreparosDisponiveis];
    
    atualizarSelectsItens();
  } catch (error) {
    console.error("Erro ao carregar itens:", error);
  }
}

// Atualizar todos os selects de itens
function atualizarSelectsItens() {
  const selects = document.querySelectorAll('.insumo-select');
  selects.forEach(select => {
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione um insumo ou pré-preparo</option>';
    
    // Primeiro insumos normais
    insumosDisponiveis.forEach(insumo => {
      const option = document.createElement('option');
      option.value = insumo.id;
      option.textContent = `${insumo.nome} (${insumo.unidade} - R$ ${(insumo.valorCompra || 0).toFixed(2)})`;
      option.setAttribute('data-nome', insumo.nome);
      option.setAttribute('data-unidade', insumo.unidade);
      option.setAttribute('data-valor-porcao', insumo.valorPorPorcao || 0);
      option.setAttribute('data-valor-compra', insumo.valorCompra || 0);
      option.setAttribute('data-tipo', 'insumo');
      select.appendChild(option);
    });
    
    // Depois pré-preparos
    prePreparosDisponiveis.forEach(pre => {
      const option = document.createElement('option');
      option.value = pre.id;
      option.textContent = `🟠 ${pre.nome} (Pré-Preparo - R$ ${(pre.valorCompra || 0).toFixed(2)}/un)`;
      option.setAttribute('data-nome', pre.nome);
      option.setAttribute('data-unidade', pre.unidade);
      option.setAttribute('data-valor-porcao', pre.valorPorPorcao || 0);
      option.setAttribute('data-valor-compra', pre.valorCompra || 0);
      option.setAttribute('data-tipo', 'pre-preparo');
      select.appendChild(option);
    });
    
    if (valorAtual && Array.from(select.options).some(opt => opt.value === valorAtual)) {
      select.value = valorAtual;
    }
  });
}

// Adicionar novo insumo na ficha
function adicionarLinhaInsumo() {
  const container = document.getElementById('insumosContainer');
  const novaLinha = document.createElement('div');
  novaLinha.className = 'insumo-item';
  novaLinha.innerHTML = `
    <select class="insumo-select" style="width: 100%;">
      <option value="">Selecione um insumo ou pré-preparo</option>
    </select>
    <input type="number" class="insumo-quantidade" placeholder="Quantidade" step="0.001" value="0">
    <select class="insumo-unidade">
      <option value="g">g</option>
      <option value="kg">kg</option>
      <option value="ml">ml</option>
      <option value="L">L</option>
      <option value="un">un</option>
    </select>
    <input type="text" class="insumo-custo" readonly placeholder="Custo (R$)" style="background:#f0f0f0;">
    <button type="button" class="btn-remover-insumo" onclick="removerInsumo(this)">🗑️</button>
  `;
  container.appendChild(novaLinha);
  
  // Atualizar o select da nova linha
  const select = novaLinha.querySelector('.insumo-select');
  select.innerHTML = '<option value="">Selecione um insumo ou pré-preparo</option>';
  
  insumosDisponiveis.forEach(insumo => {
    const option = document.createElement('option');
    option.value = insumo.id;
    option.textContent = `${insumo.nome} (${insumo.unidade} - R$ ${(insumo.valorCompra || 0).toFixed(2)})`;
    option.setAttribute('data-nome', insumo.nome);
    option.setAttribute('data-unidade', insumo.unidade);
    option.setAttribute('data-valor-porcao', insumo.valorPorPorcao || 0);
    option.setAttribute('data-valor-compra', insumo.valorCompra || 0);
    option.setAttribute('data-tipo', 'insumo');
    select.appendChild(option);
  });
  
  prePreparosDisponiveis.forEach(pre => {
    const option = document.createElement('option');
    option.value = pre.id;
    option.textContent = `🟠 ${pre.nome} (Pré-Preparo - R$ ${(pre.valorCompra || 0).toFixed(2)}/un)`;
    option.setAttribute('data-nome', pre.nome);
    option.setAttribute('data-unidade', pre.unidade);
    option.setAttribute('data-valor-porcao', pre.valorPorPorcao || 0);
    option.setAttribute('data-valor-compra', pre.valorCompra || 0);
    option.setAttribute('data-tipo', 'pre-preparo');
    select.appendChild(option);
  });
  
  select.addEventListener('change', () => calcularCustoInsumo(select));
  const quantidade = novaLinha.querySelector('.insumo-quantidade');
  quantidade.addEventListener('input', () => calcularCustoInsumo(select));
}

// Remover insumo da ficha
window.removerInsumo = function(botao) {
  const container = document.getElementById('insumosContainer');
  if (container.children.length > 1) {
    botao.closest('.insumo-item').remove();
    calcularCustoTotal();
  } else {
    mostrarMensagem("Mantenha pelo menos um ingrediente!", "erro");
  }
};

// Calcular custo de um insumo específico
function calcularCustoInsumo(select) {
  const item = select.closest('.insumo-item');
  const quantidade = parseFloat(item.querySelector('.insumo-quantidade').value) || 0;
  const selectedOption = select.options[select.selectedIndex];
  const tipo = selectedOption?.getAttribute('data-tipo') || 'insumo';
  let custo = 0;
  
  if (tipo === 'pre-preparo') {
    // Pré-preparo: custo = quantidade * valor por unidade do pré-preparo
    const valorUnitario = parseFloat(selectedOption?.getAttribute('data-valor-compra')) || 0;
    custo = quantidade * valorUnitario;
  } else {
    // Insumo normal: converter para kg/litro base
    const valorPorPorcao = parseFloat(selectedOption?.getAttribute('data-valor-porcao')) || 0;
    const unidade = selectedOption?.getAttribute('data-unidade') || 'KG';
    
    if (unidade === 'KG' || unidade === 'L') {
      const valorCompra = parseFloat(selectedOption?.getAttribute('data-valor-compra')) || 0;
      custo = quantidade * valorCompra;
    } else if (unidade === 'g' || unidade === 'ml') {
      const valorCompra = parseFloat(selectedOption?.getAttribute('data-valor-compra')) || 0;
      custo = (quantidade / 1000) * valorCompra;
    } else {
      custo = quantidade * valorPorPorcao;
    }
  }
  
  const custoInput = item.querySelector('.insumo-custo');
  custoInput.value = `R$ ${custo.toFixed(2)}`;
  
  calcularCustoTotal();
}

// Calcular custo total do produto
function calcularCustoTotal() {
  let custoTotal = 0;
  
  document.querySelectorAll('.insumo-item').forEach(item => {
    const custoText = item.querySelector('.insumo-custo').value;
    const custo = parseFloat(custoText.replace('R$ ', '')) || 0;
    custoTotal += custo;
  });
  
  const precoVenda = parseFloat(document.getElementById('precoVenda').value) || 0;
  const margem = precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda) * 100 : 0;
  const lucro = precoVenda - custoTotal;
  
  document.getElementById('custoTotal').innerHTML = `R$ ${custoTotal.toFixed(2)}`;
  document.getElementById('margem').innerHTML = `${margem.toFixed(1)}%`;
  document.getElementById('lucro').innerHTML = `R$ ${lucro.toFixed(2)}`;
  
  // Colorir margem
  const margemEl = document.getElementById('margem');
  if (margemEl) {
    if (margem < 30) margemEl.style.color = '#ff6b6b';
    else if (margem < 50) margemEl.style.color = '#ffa502';
    else margemEl.style.color = '#2ed573';
  }
  
  return custoTotal;
}

// Coletar insumos do formulário
function coletarInsumos() {
  const insumos = [];
  
  document.querySelectorAll('.insumo-item').forEach(item => {
    const select = item.querySelector('.insumo-select');
    const selectedOption = select.options[select.selectedIndex];
    const quantidade = parseFloat(item.querySelector('.insumo-quantidade').value) || 0;
    const tipo = selectedOption?.getAttribute('data-tipo') || 'insumo';
    
    if (select.value && quantidade > 0) {
      insumos.push({
        insumoId: select.value,
        nome: selectedOption?.getAttribute('data-nome') || '',
        quantidade: quantidade,
        unidade: item.querySelector('.insumo-unidade').value,
        custo: parseFloat(item.querySelector('.insumo-custo').value.replace('R$ ', '')) || 0,
        tipo: tipo
      });
    }
  });
  
  return insumos;
}

// Salvar ficha técnica
async function salvarFicha(event) {
  event.preventDefault();
  
  const setor = document.getElementById('setor').value;
  const categoria = document.getElementById('categoria').value;
  const nome = document.getElementById('nome').value;
  const precoVenda = parseFloat(document.getElementById('precoVenda').value);
  const tempoPreparo = parseInt(document.getElementById('tempoPreparo').value) || 0;
  const rendimento = parseFloat(document.getElementById('rendimento').value) || 1;
  const responsavel = document.getElementById('responsavel').value || 'Gestor';
  const custoTotal = parseFloat(document.getElementById('custoTotal').innerHTML.replace('R$ ', '')) || 0;
  const margem = parseFloat(document.getElementById('margem').innerHTML.replace('%', '')) || 0;
  
  if (!setor || !categoria || !nome || !precoVenda) {
    mostrarMensagem("Preencha todos os campos obrigatórios!", "erro");
    return;
  }
  
  const insumos = coletarInsumos();
  
  if (insumos.length === 0) {
    mostrarMensagem("Adicione pelo menos um ingrediente!", "erro");
    return;
  }
  
  try {
    await addDoc(collection(db, "produtos"), {
      setor: setor,
      categoria: categoria,
      nome: nome,
      custoTotal: custoTotal,
      precoVenda: precoVenda,
      margem: margem,
      tempoPreparo: tempoPreparo,
      rendimento: rendimento,
      responsavel: responsavel,
      insumos: insumos,
      dataAtualizacao: new Date().toISOString().split('T')[0]
    });
    
    mostrarMensagem(`✅ Produto "${nome}" salvo com sucesso!`, "sucesso");
    
    setTimeout(() => {
      if (confirm("Produto salvo! Deseja cadastrar outro?")) {
        document.getElementById('fichaForm').reset();
        document.getElementById('insumosContainer').innerHTML = '';
        adicionarLinhaInsumo();
        document.getElementById('setor').value = '';
        document.getElementById('categoria').innerHTML = '<option value="">Selecione primeiro o setor</option>';
      } else {
        window.location.href = '../public/index.html';
      }
    }, 1000);
    
  } catch (error) {
    console.error("Erro ao salvar:", error);
    mostrarMensagem("Erro ao salvar produto!", "erro");
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const setorSelect = document.getElementById('setor');
  setorSelect.addEventListener('change', () => {
    carregarCategorias();
    carregarItensDisponiveis();
  });
  
  document.getElementById('btnAddInsumo').addEventListener('click', adicionarLinhaInsumo);
  document.getElementById('fichaForm').addEventListener('submit', salvarFicha);
  document.getElementById('precoVenda').addEventListener('input', calcularCustoTotal);
  
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