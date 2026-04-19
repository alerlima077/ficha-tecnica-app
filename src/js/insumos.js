// src/js/insumos.js
import { db } from "../db/firebase.js";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("✅ insumos.js carregado com sucesso!");

let setorAtual = "pizzaria";

function formatarData() {
  const hoje = new Date();
  return hoje.toLocaleDateString('pt-BR');
}

function calcularValorPorPorcao(valorCompra, unidade) {
  if (!valorCompra) return 0;
  if (unidade === "KG") return valorCompra / 1000;
  if (unidade === "L") return valorCompra / 1000;
  if (unidade === "g") return valorCompra;
  if (unidade === "ml") return valorCompra;
  return valorCompra / 1000;
}

async function carregarInsumos() {
  console.log("🔄 Carregando insumos para setor:", setorAtual);
  
  const tbody = document.getElementById("insumosLista");
  if (!tbody) {
    console.error("❌ Elemento 'insumosLista' não encontrado!");
    return;
  }
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">🔄 Carregando...</td</tr>';
  
  try {
    const insumosRef = collection(db, "insumos");
    const q = query(insumosRef, where("setor", "==", setorAtual));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Encontrados ${snapshot.size} insumos`);
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">📭 Nenhum insumo cadastrado neste setor</td</tr>';
      return;
    }
    
    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
      const insumo = docSnap.data();
      
      // Valores seguros com fallback
      const nome = insumo.nome || "Sem nome";
      const unidade = insumo.unidade || "KG";
      const fatorRendimento = insumo.fatorRendimento || 100;
      const valorCompra = typeof insumo.valorCompra === 'number' ? insumo.valorCompra : 0;
      const valorPorPorcao = typeof insumo.valorPorPorcao === 'number' ? insumo.valorPorPorcao : 0;
      
      console.log(`   - ${nome}: R$ ${valorCompra.toFixed(2)}`);
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${nome}</strong></td>
        <td>${unidade}</td>
        <td>${fatorRendimento}%</td>
        <td class="valor-compra">R$ ${valorCompra.toFixed(2)}</td>
        <td class="valor-porcao">R$ ${valorPorPorcao.toFixed(4)}</td>
        <td>
          <button class="btn-editar" data-id="${docSnap.id}">✏️ Editar</button>
          <button class="btn-excluir" data-id="${docSnap.id}">🗑️ Excluir</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Adicionar event listeners
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => editarInsumo(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.addEventListener('click', () => excluirInsumo(btn.getAttribute('data-id')));
    });
    
    const dataEl = document.getElementById("dataAtualizacao");
    if (dataEl) dataEl.innerHTML = `📅 Última atualização: ${formatarData()}`;
    
  } catch (error) {
    console.error("❌ ERRO DETALHADO:", error);
    const tbody = document.getElementById("insumosLista");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">
        ❌ Erro ao carregar insumos<br>
        <small>${error.message}</small>
      </td></tr>`;
    }
  }
}

async function adicionarInsumo() {
  const nome = document.getElementById("modalNome")?.value.toUpperCase().trim();
  const unidade = document.getElementById("modalUnidade")?.value;
  const fatorRendimento = parseInt(document.getElementById("modalFator")?.value);
  const valorCompra = parseFloat(document.getElementById("modalValorCompra")?.value);
  const setor = document.getElementById("modalSetor")?.value;
  
  if (!nome || !valorCompra || isNaN(valorCompra)) {
    alert("⚠️ Preencha todos os campos obrigatórios!");
    return;
  }
  
  const valorPorPorcao = calcularValorPorPorcao(valorCompra, unidade);
  
  try {
    await addDoc(collection(db, "insumos"), {
      setor: setor,
      nome: nome,
      unidade: unidade,
      fatorRendimento: fatorRendimento || 100,
      valorCompra: valorCompra,
      valorPorPorcao: valorPorPorcao,
      ultimaAtualizacao: formatarData()
    });
    
    alert("✅ Insumo adicionado com sucesso!");
    fecharModal();
    carregarInsumos();
  } catch (error) {
    console.error("Erro ao adicionar:", error);
    alert("❌ Erro ao adicionar insumo: " + error.message);
  }
}

async function editarInsumo(id) {
  try {
    const docRef = doc(db, "insumos", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const insumo = { id: docSnap.id, ...docSnap.data() };
      
      document.getElementById("insumoId").value = insumo.id;
      document.getElementById("modalSetor").value = insumo.setor || "pizzaria";
      document.getElementById("modalNome").value = insumo.nome || "";
      document.getElementById("modalUnidade").value = insumo.unidade || "KG";
      document.getElementById("modalFator").value = insumo.fatorRendimento || 100;
      document.getElementById("modalValorCompra").value = insumo.valorCompra || 0;
      document.getElementById("modalTitulo").innerHTML = "✏️ Editar Insumo";
      document.getElementById("modal").style.display = "flex";
      
      const btnSalvar = document.getElementById("btnSalvarInsumo");
      btnSalvar.onclick = async () => {
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
    }
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao carregar insumo para edição");
  }
}

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

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Página carregada, iniciando...");
  carregarInsumos();
  
  const btnAbrir = document.getElementById("btnAbrirModal");
  if (btnAbrir) btnAbrir.onclick = () => document.getElementById("modal").style.display = "flex";
  
  const btnFechar = document.getElementById("btnFecharModal");
  if (btnFechar) btnFechar.onclick = fecharModal;
  
  const btnSalvar = document.getElementById("btnSalvarInsumo");
  if (btnSalvar) btnSalvar.onclick = adicionarInsumo;
  
  window.onclick = (e) => {
    if (e.target === document.getElementById("modal")) fecharModal();
  };
  
  document.querySelectorAll(".btn-setor").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".btn-setor").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      setorAtual = btn.getAttribute("data-setor");
      carregarInsumos();
    };
  });
});