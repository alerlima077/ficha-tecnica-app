// src/js/ficha-tecnica.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let insumosDisponiveis = [];
let produtoEditandoId = null;

// ============ VERIFICAR SE É EDIÇÃO ============
const urlParams = new URLSearchParams(window.location.search);
const editarId = urlParams.get('editar');
if (editarId) {
    produtoEditandoId = editarId;
    console.log("✏️ Modo edição - Produto ID:", produtoEditandoId);
}

// ============ FUNÇÕES ============
function mostrarMensagem(texto, tipo) {
  const msg = document.getElementById('mensagem');
  if (!msg) return;
  msg.textContent = texto;
  msg.className = `mensagem ${tipo}`;
  msg.style.display = 'block';
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);
}

// Carregar categorias baseado no setor
async function carregarCategorias(setorSelecionado = null, categoriaSelecionada = null) {
  const setor = setorSelecionado || document.getElementById('setor').value;
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
    if (categoriaSelecionada === cat) {
      option.selected = true;
    }
    categoriaSelect.appendChild(option);
  });
}

// Carregar insumos disponíveis
async function carregarInsumosDisponiveis() {
  try {
    const setor = document.getElementById('setor').value;
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
    console.error("Erro ao carregar insumos:", error);
  }
}

function atualizarSelectsInsumos() {
  const selects = document.querySelectorAll('.insumo-select');
  selects.forEach(select => {
    const valorAtual = select.getAttribute('data-valor-atual') || select.value;
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

function adicionarLinhaInsumo(insumoExistente = null) {
  const container = document.getElementById('insumosContainer');
  const novaLinha = document.createElement('div');
  novaLinha.className = 'insumo-item';
  novaLinha.innerHTML = `
    <select class="insumo-select" style="width: 100%;">
      <option value="">Selecione um insumo</option>
    </select>
    <input type="number" class="insumo-quantidade" placeholder="Quantidade" step="0.001" value="${insumoExistente ? insumoExistente.quantidade : 0}">
    <select class="insumo-unidade">
      <option value="g">g</option>
      <option value="kg">kg</option>
      <option value="ml">ml</option>
      <option value="L">L</option>
      <option value="un">un</option>
    </select>
    <input type="text" class="insumo-custo" readonly placeholder="Custo (R$)" style="background:#f0f0f0;" value="${insumoExistente ? `R$ ${insumoExistente.custo.toFixed(2)}` : ''}">
    <button type="button" class="btn-remover-insumo" onclick="removerInsumo(this)">🗑️</button>
  `;
  container.appendChild(novaLinha);
  
  const select = novaLinha.querySelector('.insumo-select');
  
  // Preencher select
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
  
  if (insumoExistente && insumoExistente.insumoId) {
    select.value = insumoExistente.insumoId;
    select.setAttribute('data-valor-atual', insumoExistente.insumoId);
  }
  
  select.addEventListener('change', () => calcularCustoInsumo(select));
  const quantidade = novaLinha.querySelector('.insumo-quantidade');
  quantidade.addEventListener('input', () => calcularCustoInsumo(select));
  
  if (insumoExistente && insumoExistente.quantidade > 0) {
    calcularCustoInsumo(select);
  }
}

window.removerInsumo = function(botao) {
  const container = document.getElementById('insumosContainer');
  if (container.children.length > 1) {
    botao.closest('.insumo-item').remove();
    calcularCustoTotal();
  } else {
    mostrarMensagem("Mantenha pelo menos um ingrediente!", "erro");
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
  
  const margemEl = document.getElementById('margem');
  if (margem < 30) margemEl.style.color = '#ff6b6b';
  else if (margem < 50) margemEl.style.color = '#ffa502';
  else margemEl.style.color = '#2ed573';
  
  return custoTotal;
}

function coletarInsumos() {
  const insumos = [];
  
  document.querySelectorAll('.insumo-item').forEach(item => {
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

// ============ CARREGAR PRODUTO PARA EDIÇÃO ============
async function carregarProdutoParaEdicao(id) {
  console.log("📡 Carregando produto para edição:", id);
  
  try {
    const docRef = doc(db, "produtos", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const produto = docSnap.data();
      console.log("✅ Produto encontrado:", produto.nome);
      
      // Preencher campos básicos
      document.getElementById('setor').value = produto.setor || '';
      document.getElementById('nome').value = produto.nome || '';
      document.getElementById('precoVenda').value = produto.precoVenda || '';
      document.getElementById('tempoPreparo').value = produto.tempoPreparo || '';
      document.getElementById('rendimento').value = produto.rendimento || 1;
      document.getElementById('responsavel').value = produto.responsavel || '';
      
      // Carregar categorias
      await carregarCategorias(produto.setor, produto.categoria);
      
      // Carregar insumos disponíveis
      await carregarInsumosDisponiveis();
      
      // Limpar container de insumos
      const container = document.getElementById('insumosContainer');
      container.innerHTML = '';
      
      // Adicionar insumos existentes
      if (produto.insumos && produto.insumos.length > 0) {
        for (const insumo of produto.insumos) {
          adicionarLinhaInsumo(insumo);
        }
      } else {
        adicionarLinhaInsumo();
      }
      
      // Calcular custo total
      setTimeout(() => {
        calcularCustoTotal();
      }, 200);
      
      // Mudar texto do botão
      const btnSalvar = document.querySelector('.btn-salvar-ficha');
      if (btnSalvar) {
        btnSalvar.textContent = "✏️ ATUALIZAR PRODUTO";
        btnSalvar.style.background = "linear-gradient(135deg, #28a745, #20c997)";
      }
      
      mostrarMensagem(`✅ Produto "${produto.nome}" carregado para edição!`, "sucesso");
      
    } else {
      mostrarMensagem("❌ Produto não encontrado!", "erro");
    }
  } catch (error) {
    console.error("Erro ao carregar produto:", error);
    mostrarMensagem("Erro ao carregar produto para edição!", "erro");
  }
}

// ============ SALVAR OU ATUALIZAR ============
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
  
  const dadosProduto = {
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
  };
  
  try {
    if (produtoEditandoId) {
      // ATUALIZAR
      await updateDoc(doc(db, "produtos", produtoEditandoId), dadosProduto);
      mostrarMensagem(`✅ Produto "${nome}" atualizado com sucesso!`, "sucesso");
    } else {
      // CRIAR NOVO
      await addDoc(collection(db, "produtos"), {
        ...dadosProduto,
        dataCriacao: new Date().toISOString().split('T')[0]
      });
      mostrarMensagem(`✅ Produto "${nome}" salvo com sucesso!`, "sucesso");
    }
    
    setTimeout(() => {
      if (confirm("Produto salvo! Deseja cadastrar outro?")) {
        window.location.href = 'ficha-tecnica.html';
      } else {
        window.location.href = '../public/index.html';
      }
    }, 1500);
    
  } catch (error) {
    console.error("Erro ao salvar:", error);
    mostrarMensagem("Erro ao salvar produto!", "erro");
  }
}

// ============ EVENTOS ============
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Ficha técnica carregada!");
  
  // Configurar eventos
  const setorSelect = document.getElementById('setor');
  setorSelect.addEventListener('change', () => {
    carregarCategorias();
    carregarInsumosDisponiveis();
  });
  
  document.getElementById('btnAddInsumo').addEventListener('click', () => adicionarLinhaInsumo());
  document.getElementById('fichaForm').addEventListener('submit', salvarFicha);
  document.getElementById('precoVenda').addEventListener('input', calcularCustoTotal);
  
  // Se for modo edição, carregar produto
  if (produtoEditandoId) {
    console.log("✏️ Modo edição ativado para ID:", produtoEditandoId);
    // Aguardar o setor ser carregado
    setTimeout(async () => {
      await carregarProdutoParaEdicao(produtoEditandoId);
    }, 100);
  } else {
    // Inicialização normal
    adicionarLinhaInsumo();
    carregarInsumosDisponiveis();
  }
});