// src/js/ficha-tecnica.js
import { db } from "../db/firebase.js";
import { 
  collection, addDoc, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============ VARIÁVEIS GLOBAIS ============
let ingredientesCount = 1;

// ============ ADICIONAR INGREDIENTE ============
window.adicionarIngrediente = function() {
  const container = document.getElementById("ingredientesList");
  const newIndex = ingredientesCount;
  
  const div = document.createElement("div");
  div.className = "ingrediente-item";
  div.setAttribute("data-index", newIndex);
  div.innerHTML = `
    <input type="text" placeholder="Nome do ingrediente" class="ingrediente-nome">
    <input type="number" step="0.001" placeholder="Quantidade" class="ingrediente-qtd">
    <select class="ingrediente-unidade">
      <option value="g">g</option>
      <option value="kg">kg</option>
      <option value="ml">ml</option>
      <option value="L">L</option>
      <option value="un">unidade</option>
    </select>
    <input type="number" step="0.01" placeholder="Custo unitário (R$)" class="ingrediente-custoUnit">
    <input type="text" placeholder="Fornecedor" class="ingrediente-fornecedor">
    <button type="button" onclick="removerIngrediente(this)" style="background:#dc3545; padding:5px 10px;">❌</button>
  `;
  
  container.appendChild(div);
  ingredientesCount++;
};

window.removerIngrediente = function(button) {
  button.parentElement.remove();
  calcularCustoTotal();
};

// ============ CALCULAR CUSTO TOTAL ============
function calcularCustoTotal() {
  let totalIngredientes = 0;
  
  document.querySelectorAll('.ingrediente-item').forEach(item => {
    const qtd = parseFloat(item.querySelector('.ingrediente-qtd')?.value) || 0;
    const custoUnit = parseFloat(item.querySelector('.ingrediente-custoUnit')?.value) || 0;
    
    // Converter quantidade para kg se necessário
    const unidade = item.querySelector('.ingrediente-unidade')?.value;
    let qtdKg = qtd;
    if (unidade === 'g') qtdKg = qtd / 1000;
    else if (unidade === 'ml') qtdKg = qtd / 1000;
    else if (unidade === 'un') qtdKg = qtd * 0.1; // Aproximação para unidades
    else qtdKg = qtd;
    
    totalIngredientes += qtdKg * custoUnit;
  });
  
  // Adicionar custos indiretos
  const custoGas = parseFloat(document.getElementById('custoGas')?.value) || 0;
  const custoAgua = parseFloat(document.getElementById('custoAgua')?.value) || 0;
  const custoEmbalagem = parseFloat(document.getElementById('custoEmbalagem')?.value) || 0;
  const custoDelivery = parseFloat(document.getElementById('custoDelivery')?.value) || 0;
  const custoMaoObra = parseFloat(document.getElementById('custoMaoObra')?.value) || 0;
  
  const custoTotal = totalIngredientes + custoGas + custoAgua + custoEmbalagem + custoDelivery + custoMaoObra;
  
  const custoTotalEl = document.getElementById('custoTotal');
  if (custoTotalEl) {
    custoTotalEl.innerHTML = `R$ ${custoTotal.toFixed(2)}`;
  }
  
  // Calcular margem real
  const precoVenda = parseFloat(document.getElementById('precoVenda')?.value) || 0;
  if (precoVenda > 0) {
    const margemReal = ((precoVenda - custoTotal) / precoVenda) * 100;
    const margemRealEl = document.getElementById('margemReal');
    if (margemRealEl) {
      margemRealEl.value = `${margemReal.toFixed(1)}%`;
      
      // Colorir baseado na margem
      if (margemReal < 30) margemRealEl.style.color = 'red';
      else if (margemReal < 50) margemRealEl.style.color = 'orange';
      else margemRealEl.style.color = 'green';
    }
  }
  
  return custoTotal;
}

// ============ COLETAR INGREDIENTES ============
function coletarIngredientes() {
  const ingredientes = [];
  
  document.querySelectorAll('.ingrediente-item').forEach(item => {
    const nome = item.querySelector('.ingrediente-nome')?.value;
    if (nome) {
      ingredientes.push({
        nome: nome,
        quantidade: parseFloat(item.querySelector('.ingrediente-qtd')?.value) || 0,
        unidade: item.querySelector('.ingrediente-unidade')?.value || 'g',
        custoUnitario: parseFloat(item.querySelector('.ingrediente-custoUnit')?.value) || 0,
        fornecedor: item.querySelector('.ingrediente-fornecedor')?.value || ''
      });
    }
  });
  
  return ingredientes;
}

// ============ MOSTRAR MENSAGEM ============
function mostrarMensagem(tipo, texto) {
  const successDiv = document.getElementById('successMessage');
  const errorDiv = document.getElementById('errorMessage');
  
  if (tipo === 'success') {
    successDiv.textContent = texto;
    successDiv.style.display = 'block';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  } else {
    errorDiv.textContent = texto;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  }
}

// ============ SALVAR FICHA TÉCNICA ============
async function salvarFicha(event) {
  event.preventDefault();
  
  try {
    // Verificar campos obrigatórios
    const nome = document.getElementById('nome')?.value;
    const sku = document.getElementById('sku')?.value;
    const categoria = document.getElementById('categoria')?.value;
    const tamanho = document.getElementById('tamanho')?.value;
    const precoVenda = parseFloat(document.getElementById('precoVenda')?.value);
    
    if (!nome || !sku || !categoria || !tamanho || !precoVenda) {
      mostrarMensagem('error', 'Preencha todos os campos obrigatórios (*)');
      return;
    }
    
    const ingredientes = coletarIngredientes();
    const custoTotal = calcularCustoTotal();
    const margemReal = precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda) * 100 : 0;
    
    // Coletar todos os dados
    const fichaData = {
      // 1. Identificação
      nome: nome,
      sku: sku,
      categoria: categoria,
      tamanho: tamanho,
      
      // 2. Descrição
      descricao: document.getElementById('descricao')?.value || '',
      caracteristicas: document.getElementById('caracteristicas')?.value || '',
      diferenciais: document.getElementById('diferenciais')?.value || '',
      
      // 3-7. Ingredientes
      ingredientes: ingredientes,
      
      // 8. Custo total
      custoTotalCMV: custoTotal,
      
      // 9. Custos indiretos
      custosIndiretos: {
        gas: parseFloat(document.getElementById('custoGas')?.value) || 0,
        agua: parseFloat(document.getElementById('custoAgua')?.value) || 0,
        embalagem: parseFloat(document.getElementById('custoEmbalagem')?.value) || 0,
        taxaDelivery: parseFloat(document.getElementById('custoDelivery')?.value) || 0,
        maoObra: parseFloat(document.getElementById('custoMaoObra')?.value) || 0
      },
      
      // 10-11. Preço e margem
      precoVenda: precoVenda,
      margemDesejada: parseFloat(document.getElementById('margemDesejada')?.value) || 0,
      margemReal: margemReal,
      
      // 12. Rendimento
      rendimento: parseFloat(document.getElementById('rendimento')?.value) || 1,
      porcionamento: document.getElementById('porcionamento')?.value || '',
      
      // 13. Modo de preparo
      modoPreparo: document.getElementById('modoPreparo')?.value || '',
      
      // 14. Tempo de preparo
      tempoPreparo: {
        total: parseFloat(document.getElementById('tempoTotal')?.value) || 0,
        forno: parseFloat(document.getElementById('tempoForno')?.value) || 0,
        montagem: parseFloat(document.getElementById('tempoMontagem')?.value) || 0
      },
      
      // 15. Equipamentos
      equipamentos: document.getElementById('equipamentos')?.value || '',
      
      // 16. Padrão de montagem
      padraoMontagem: document.getElementById('padraoMontagem')?.value || '',
      
      // 17. Controle de qualidade
      controleQualidade: {
        pontoMassa: document.getElementById('qualidadeMassa')?.value || '',
        tempoIdeal: document.getElementById('qualidadeTempo')?.value || '',
        aparencia: document.getElementById('qualidadeAparencia')?.value || '',
        pesoFinal: parseFloat(document.getElementById('qualidadePeso')?.value) || 0
      },
      
      // 18. Informações nutricionais
      informacoesNutricionais: {
        calorias: parseFloat(document.getElementById('nutriCalorias')?.value) || 0,
        proteinas: parseFloat(document.getElementById('nutriProteinas')?.value) || 0,
        alergenicos: document.getElementById('nutriAlergenicos')?.value || ''
      },
      
      // 19. Fornecedores
      fornecedores: document.getElementById('fornecedores')?.value || '',
      
      // 20. Data e versão
      dataCriacao: document.getElementById('dataCriacao')?.value || new Date().toISOString().split('T')[0],
      dataAtualizacao: new Date().toISOString(),
      versao: parseFloat(document.getElementById('versao')?.value) || 1,
      
      // 21. Responsável
      responsavel: document.getElementById('responsavel')?.value || '',
      
      // Timestamp para ordenação
      createdAt: new Date()
    };
    
    // Salvar no Firebase
    const docRef = await addDoc(collection(db, "fichasTecnicas"), fichaData);
    
    mostrarMensagem('success', `✅ Ficha técnica "${nome}" salva com sucesso! ID: ${docRef.id}`);
    
    // Opcional: limpar formulário ou redirecionar
    setTimeout(() => {
      if (confirm('Ficha salva! Deseja criar outra ficha?')) {
        document.getElementById('fichaForm').reset();
        document.getElementById('ingredientesList').innerHTML = '';
        ingredientesCount = 0;
        window.adicionarIngrediente();
      } else {
        window.location.href = 'index.html';
      }
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    mostrarMensagem('error', '❌ Erro ao salvar ficha técnica. Verifique o Firebase.');
  }
}

// ============ AUTO CALCULAR CUSTO ============
function setupAutoCalculate() {
  const campos = [
    'custoGas', 'custoAgua', 'custoEmbalagem', 'custoDelivery', 'custoMaoObra', 'precoVenda'
  ];
  
  campos.forEach(campo => {
    const el = document.getElementById(campo);
    if (el) {
      el.addEventListener('input', () => calcularCustoTotal());
    }
  });
  
  // Observer para ingredientes
  const observer = new MutationObserver(() => calcularCustoTotal());
  observer.observe(document.getElementById('ingredientesList'), { childList: true, subtree: true, attributes: true });
}

// ============ INICIALIZAR ============
document.addEventListener('DOMContentLoaded', () => {
  // Adicionar primeiro ingrediente
  if (document.querySelectorAll('.ingrediente-item').length === 0) {
    window.adicionarIngrediente();
  }
  
  // Configurar eventos
  const form = document.getElementById('fichaForm');
  if (form) {
    form.addEventListener('submit', salvarFicha);
  }
  
  // Data de criação automática
  const dataCriacao = document.getElementById('dataCriacao');
  if (dataCriacao && !dataCriacao.value) {
    dataCriacao.value = new Date().toISOString().split('T')[0];
  }
  
  setupAutoCalculate();
  calcularCustoTotal();
});