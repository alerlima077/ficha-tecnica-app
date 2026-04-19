// src/js/dashboard.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Carregar estatísticas dos setores
async function carregarEstatisticas() {
  try {
    // Contar produtos por setor
    const produtosRef = collection(db, "produtos");
    const produtosSnapshot = await getDocs(produtosRef);
    
    let pizzariaProdutos = 0;
    let restauranteProdutos = 0;
    let padariaProdutos = 0;
    let totalCusto = 0;
    let totalPreco = 0;
    
    produtosSnapshot.forEach(doc => {
      const produto = doc.data();
      switch(produto.setor) {
        case 'pizzaria':
          pizzariaProdutos++;
          break;
        case 'restaurante':
          restauranteProdutos++;
          break;
        case 'padaria':
          padariaProdutos++;
          break;
      }
      totalCusto += produto.custoTotal || 0;
      totalPreco += produto.precoVenda || 0;
    });
    
    // Contar insumos por setor
    const insumosRef = collection(db, "insumos");
    const insumosSnapshot = await getDocs(insumosRef);
    
    let pizzariaInsumos = 0;
    let restauranteInsumos = 0;
    let padariaInsumos = 0;
    
    insumosSnapshot.forEach(doc => {
      const insumo = doc.data();
      switch(insumo.setor) {
        case 'pizzaria':
          pizzariaInsumos++;
          break;
        case 'restaurante':
          restauranteInsumos++;
          break;
        case 'padaria':
          padariaInsumos++;
          break;
      }
    });
    
    // Atualizar DOM
    document.getElementById('pizzaria-produtos').textContent = pizzariaProdutos;
    document.getElementById('pizzaria-insumos').textContent = pizzariaInsumos;
    document.getElementById('restaurante-produtos').textContent = restauranteProdutos;
    document.getElementById('restaurante-insumos').textContent = restauranteInsumos;
    document.getElementById('padaria-produtos').textContent = padariaProdutos;
    document.getElementById('padaria-insumos').textContent = padariaInsumos;
    
    document.getElementById('total-produtos').textContent = produtosSnapshot.size;
    document.getElementById('total-insumos').textContent = insumosSnapshot.size;
    
    const custoMedio = produtosSnapshot.size > 0 ? totalCusto / produtosSnapshot.size : 0;
    document.getElementById('custo-medio').textContent = `R$ ${custoMedio.toFixed(2)}`;
    
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  carregarEstatisticas();
  
  // Nome do usuário (pode vir do auth depois)
  const userName = localStorage.getItem('userName') || 'Gestor';
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) userNameSpan.textContent = userName;
});