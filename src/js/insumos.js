// src/js/insumos.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let setorAtual = "pizzaria";

// Formatar data
function formatarData() {
  const hoje = new Date();
  return hoje.toLocaleDateString('pt-BR');
}

// Calcular valor por porção (por grama/litro)
function calcularValorPorPorcao(valorCompra, unidade) {
  if (unidade === "KG") return valorCompra / 1000;
  if (unidade === "L") return valorCompra / 1000;
  if (unidade === "g") return valorCompra;
  if (unidade === "ml") return valorCompra;
  return valorCompra / 1000;
}

// Carregar insumos
async function carregarInsumos() {
  const tbody = document.getElementById("insumosLista");
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td</tr>';
  
  try {
    const q = query(collection(db, "insumos"), where("setor", "==", setorAtual));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">📭 Nenhum insumo cadastrado neste setor</td</tr>';
      return;
    }
    
    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
      const insumo = docSnap.data();
      const row = document.createElement("tr");
      
      row.innerHTML = `
        <td><strong>${insumo.nome}</strong></td>
        <td>${insumo.unidade}</td>
        <td>${insumo.fatorRendimento}%</td>
        <td class="valor-compra">R$ ${insumo.valorCompra.toFixed(2)}</td>
        <td class="valor-porcao">R$ ${insumo.valorPorPorcao.toFixed(4)}</td>
        <td>
          <button class="btn-editar" data-id="${docSnap.id}">✏️ Editar</button>
          <button class="btn-excluir" data-id="${docSnap.id}">🗑️ Excluir</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Adicionar event listeners para os botões
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => editarInsumo(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.addEventListener('click', () => excluirInsumo(btn.getAttribute('data-id')));
    });
    
    document.getElementById("dataAtualizacao").innerHTML = `📅 Última atualização: ${formatarData()}`;
  } catch (error) {
    console.error("Erro:", error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">❌ Erro ao carregar insumos</td</tr>';
  }
}

// Adicionar insumo
async function adicionarInsumo() {
  const nome = document.getElementById("modalNome").value.toUpperCase().trim();
  const unidade = document.getElementById("modalUnidade").value;
  const fatorRendimento = parseInt(document.getElementById("modalFator").value);
  const valorCompra = parseFloat(document.getElementById("modalValorCompra").value);
  const setor = document.getElementById("modalSetor").value;
  
  if (!nome || !valorCompra) {
    alert("⚠️ Preencha todos os campos obrigatórios!");
    return;
  }
  
  const valorPorPorcao = calcularValorPorPorcao(valorCompra, unidade);
  
  try {
    await addDoc(collection(db, "insumos"), {
      setor: setor,
      nome: nome,
      unidade: unidade,
      fatorRendimento: fatorRendimento,
      valorCompra: valorCompra,
      valorPorPorcao: valorPorPorcao,
      ultimaAtualizacao: formatarData()
    });
    
    alert("✅ Insumo adicionado com sucesso!");
    fecharModal();
    carregarInsumos();
  } catch (error) {
    console.error("Erro:", error);
    alert("❌ Erro ao adicionar insumo");
  }
}

// Editar insumo
async function editarInsumo(id) {
  try {
    const docRef = doc(db, "insumos", id);
    const docSnap = await getDocs(query(collection(db, "insumos")));
    let insumo = null;
    
    for (const d of docSnap.docs) {
      if (d.id === id) {
        insumo = { id: d.id, ...d.data() };
        break;
      }
    }
    
    if (insumo) {
      document.getElementById("insumoId").value = insumo.id;
      document.getElementById("modalSetor").value = insumo.setor;
      document.getElementById("modalNome").value = insumo.nome;
      document.getElementById("modalUnidade").value = insumo.unidade;
      document.getElementById("modalFator").value = insumo.fatorRendimento;
      document.getElementById("modalValorCompra").value = insumo.valorCompra;
      document.getElementById("modalTitulo").innerHTML = "✏️ Editar Insumo";
      document.getElementById("modal").style.display = "flex";
      
      const btnSalvar = document.getElementById("btnSalvarInsumo");
      const novoSalvar = async () => {
        const novoValorCompra = parseFloat(document.getElementById("modalValorCompra").value);
        const novoValorPorPorcao = calcularValorPorPorcao(novoValorCompra, insumo.unidade);
        
        await updateDoc(doc(db, "insumos", insumo.id), {
          nome: document.getElementById("modalNome").value.toUpperCase().trim(),
          setor: document.getElementById("modalSetor").value,
          unidade: document.getElementById("modalUnidade").value,
          fatorRendimento: parseInt(document.getElementById("modalFator").value),
          valorCompra: novoValorCompra,
          valorPorPorcao: novoValorPorPorcao,
          ultimaAtualizacao: formatarData()
        });
        
        alert("✅ Insumo atualizado!");
        fecharModal();
        carregarInsumos();
      };
      
      btnSalvar.onclick = novoSalvar;
    }
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao carregar insumo para edição");
  }
}

// Excluir insumo
async function excluirInsumo(id) {
  if (confirm("⚠️ Tem certeza que deseja excluir este insumo?")) {
    try {
      await deleteDoc(doc(db, "insumos", id));
      alert("✅ Insumo excluído!");
      carregarInsumos();
    } catch (error) {
      console.error("Erro:", error);
      alert("❌ Erro ao excluir insumo");
    }
  }
}

// Fechar modal
function fecharModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("insumoId").value = "";
  document.getElementById("modalNome").value = "";
  document.getElementById("modalValorCompra").value = "";
  document.getElementById("modalFator").value = "100";
  document.getElementById("modalTitulo").innerHTML = "➕ Adicionar Insumo";
  
  const btnSalvar = document.getElementById("btnSalvarInsumo");
  btnSalvar.onclick = adicionarInsumo;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  carregarInsumos();
  
  document.getElementById("btnAbrirModal").onclick = () => {
    document.getElementById("modal").style.display = "flex";
  };
  
  document.getElementById("btnFecharModal").onclick = fecharModal;
  document.getElementById("btnSalvarInsumo").onclick = adicionarInsumo;
  
  // Fechar modal ao clicar fora
  window.onclick = (e) => {
    if (e.target === document.getElementById("modal")) fecharModal();
  };
  
  // Filtros por setor
  document.querySelectorAll(".btn-setor").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".btn-setor").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      setorAtual = btn.getAttribute("data-setor");
      carregarInsumos();
    };
  });
});