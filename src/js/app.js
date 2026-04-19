// src/js/app.js

// Importando conexão com Firebase
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Função para carregar produtos do Firestore
async function carregarProdutosFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "produtos"));
    const lista = document.getElementById("produtos-lista");
    lista.innerHTML = "";

    let totalCusto = 0;
    let totalPreco = 0;
    let totalProdutos = 0;

    querySnapshot.forEach((doc) => {
      const produto = doc.data();
      totalProdutos++;
      totalCusto += produto.custo;
      totalPreco += produto.precoVenda;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><img src="${produto.fotoURL}" alt="${produto.nome}" width="60"></td>
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td>R$ ${produto.custo.toFixed(2)}</td>
        <td>R$ ${produto.precoVenda.toFixed(2)}</td>
        <td>
          <button onclick="editarProduto('${doc.id}')">Editar</button>
          <button onclick="removerProduto('${doc.id}')">Remover</button>
        </td>
      `;
      lista.appendChild(row);
    });

    atualizarDashboard(totalProdutos, totalCusto, totalPreco);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

// Função para atualizar o dashboard
function atualizarDashboard(totalProdutos, totalCusto, totalPreco) {
  const custoMedio = totalProdutos > 0 ? totalCusto / totalProdutos : 0;
  const margemMedia = totalProdutos > 0 ? ((totalPreco - totalCusto) / totalPreco) * 100 : 0;
  const receitaEstimada = totalPreco;

  document.getElementById("total-produtos").textContent = totalProdutos;
  document.getElementById("custo-medio").textContent = `R$ ${custoMedio.toFixed(2)}`;
  document.getElementById("margem-media").textContent = `${margemMedia.toFixed(1)}%`;
  document.getElementById("receita-estimada").textContent = `R$ ${receitaEstimada.toFixed(2)}`;
}

// Funções de exemplo para editar/remover (ainda não implementadas)
function editarProduto(id) {
  alert(`Editar produto ID: ${id}`);
}

function removerProduto(id) {
  alert(`Remover produto ID: ${id}`);
}

// Inicialização
window.onload = () => {
  carregarProdutosFirestore();
};

