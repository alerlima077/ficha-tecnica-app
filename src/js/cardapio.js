// src/js/cardapio.js
import { db } from "../db/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let produtos = [];
let categoriasMap = new Map();
let setoresMap = new Map();

function getConfig() {
    return {
        simples: parseFloat(localStorage.getItem('configSimples')) || 6.0,
        cartao: parseFloat(localStorage.getItem('configCartao')) || 3.5,
        quantidade: parseInt(localStorage.getItem('configQuantidade')) || 1
    };
}

function salvarConfig(simples, cartao, quantidade) {
    localStorage.setItem('configSimples', simples);
    localStorage.setItem('configCartao', cartao);
    localStorage.setItem('configQuantidade', quantidade);
}

function calcularIndicadores(produto, config) {
    const cmv = produto.custoTotal || 0;
    const precoVenda = produto.precoVenda || 0;
    const quantidade = config.quantidade || 1;
    
    const margemContribuicao = precoVenda - cmv;
    const percentualCusto = precoVenda > 0 ? (cmv / precoVenda) * 100 : 0;
    const percentualMargem = precoVenda > 0 ? (margemContribuicao / precoVenda) * 100 : 0;
    
    const impostoSimples = precoVenda * (config.simples / 100);
    const taxaCartao = precoVenda * (config.cartao / 100);
    const cet = cmv + impostoSimples + taxaCartao;
    const margemReal = precoVenda - cet;
    const margemRealPercentual = precoVenda > 0 ? (margemReal / precoVenda) * 100 : 0;
    
    const cmvIdeal = precoVenda * 0.33;
    const deficitSuperavit = margemReal - cmvIdeal;
    const pvIdeal = cmv > 0 ? cmv / 0.33 : 0;
    const statusPrecificacao = precoVenda >= pvIdeal ? "🟢 Preço OK" : "🔴 Preço Defasado";
    const statusCss = percentualCusto <= 33 ? "custo-verde" : "custo-vermelho";
    const statusPrecoCss = precoVenda >= pvIdeal ? "preco-ok" : "preco-defasado";
    
    return {
        cmv,
        margemContribuicao,
        percentualCusto,
        percentualMargem,
        impostoSimples,
        taxaCartao,
        cet,
        margemReal,
        margemRealPercentual,
        cmvIdeal,
        deficitSuperavit,
        pvIdeal,
        statusPrecificacao,
        statusCss,
        statusPrecoCss,
        cmvTotal: cmv * quantidade
    };
}

async function carregarProdutos() {
    const tbody = document.getElementById('cardapioLista');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="19" style="text-align: center;">🔄 Carregando produtos...</td</tr>';
    
    try {
        console.log("📡 Buscando produtos no Firestore...");
        const snapshot = await getDocs(collection(db, "produtos"));
        
        console.log(`📦 Encontrados ${snapshot.size} produtos`);
        
        produtos = [];
        categoriasMap.clear();
        setoresMap.clear();
        
        snapshot.forEach(doc => {
            const produto = { id: doc.id, ...doc.data() };
            produtos.push(produto);
            console.log(`   - ${produto.nome}: setor=${produto.setor}, categoria=${produto.categoria}, custo=${produto.custoTotal}, preco=${produto.precoVenda}`);
            
            if (produto.categoria) {
                categoriasMap.set(produto.categoria, produto.categoria);
            }
            if (produto.setor) {
                setoresMap.set(produto.setor, produto.setor);
            }
        });
        
        if (produtos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="19" style="text-align: center;">📭 Nenhum produto cadastrado. Crie uma Ficha Técnica primeiro!</td</tr>';
            return;
        }
        
        atualizarFiltros();
        aplicarFiltros();
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        tbody.innerHTML = `<tr><td colspan="19" style="text-align: center; color: red;">❌ Erro ao carregar: ${error.message}</td</tr>`;
    }
}

function atualizarFiltros() {
    const setorSelect = document.getElementById('filtroSetor');
    const categoriaSelect = document.getElementById('filtroCategoria');
    
    if (setorSelect) {
        setorSelect.innerHTML = '<option value="">Todos os Setores</option>';
        setoresMap.forEach(setor => {
            const nomeSetor = setor === 'pizzaria' ? '🍕 Pizzaria' : setor === 'restaurante' ? '🍔 Restaurante' : '🥖 Padaria';
            const option = document.createElement('option');
            option.value = setor;
            option.textContent = nomeSetor;
            setorSelect.appendChild(option);
        });
    }
    
    if (categoriaSelect) {
        categoriaSelect.innerHTML = '<option value="">Todas as Categorias</option>';
        categoriasMap.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categoriaSelect.appendChild(option);
        });
    }
}

function aplicarFiltros() {
    const setor = document.getElementById('filtroSetor')?.value || '';
    const categoria = document.getElementById('filtroCategoria')?.value || '';
    const busca = document.getElementById('filtroBusca')?.value.toLowerCase() || '';
    const config = getConfig();
    
    let produtosFiltrados = [...produtos];
    
    if (setor) {
        produtosFiltrados = produtosFiltrados.filter(p => p.setor === setor);
    }
    if (categoria) {
        produtosFiltrados = produtosFiltrados.filter(p => p.categoria === categoria);
    }
    if (busca) {
        produtosFiltrados = produtosFiltrados.filter(p => p.nome && p.nome.toLowerCase().includes(busca));
    }
    
    console.log(`🔍 Filtrados: ${produtosFiltrados.length} produtos`);
    
    renderizarTabela(produtosFiltrados, config);
    renderizarResumo(produtosFiltrados, config);
}

function renderizarTabela(produtosLista, config) {
    const tbody = document.getElementById('cardapioLista');
    
    if (produtosLista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" style="text-align: center;">📭 Nenhum produto encontrado com os filtros selecionados</td</tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    produtosLista.forEach(produto => {
        const indicadores = calcularIndicadores(produto, config);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${produto.categoria || '-'}</td>
            <td style="text-align: left;"><strong>${produto.nome || '-'}</strong></td>
            <td>R$ ${indicadores.cmv.toFixed(2)}</td>
            <td>${config.quantidade}</td>
            <td>R$ ${indicadores.cmvTotal.toFixed(2)}</td>
            <td>R$ ${(produto.precoVenda || 0).toFixed(2)}</td>
            <td>R$ ${indicadores.margemContribuicao.toFixed(2)}</td>
            <td class="${indicadores.statusCss}" style="font-weight: bold;">${indicadores.percentualCusto.toFixed(1)}%</td>
            <td>${indicadores.percentualMargem.toFixed(1)}%</td>
            <td>R$ ${indicadores.impostoSimples.toFixed(2)}</td>
            <td>R$ ${indicadores.taxaCartao.toFixed(2)}</td>
            <td>R$ ${indicadores.cet.toFixed(2)}</td>
            <td>R$ ${indicadores.margemReal.toFixed(2)}</td>
            <td>${indicadores.margemRealPercentual.toFixed(1)}%</td>
            <td>R$ ${indicadores.cmvIdeal.toFixed(2)}</td>
            <td>${indicadores.margemRealPercentual.toFixed(1)}%</td>
            <td class="${indicadores.deficitSuperavit >= 0 ? 'superavit' : 'deficit'}">
                ${indicadores.deficitSuperavit >= 0 ? '🟢' : '🔴'} R$ ${Math.abs(indicadores.deficitSuperavit).toFixed(2)}
                ${indicadores.deficitSuperavit >= 0 ? 'Superávit' : 'Déficit'}
            </td>
            <td>R$ ${indicadores.pvIdeal.toFixed(2)}</td>
            <td class="${indicadores.statusPrecoCss}">${indicadores.statusPrecificacao}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderizarResumo(produtosLista, config) {
    if (produtosLista.length === 0) {
        document.getElementById('resumoCardapio').innerHTML = '';
        return;
    }
    
    const totalCMV = produtosLista.reduce((sum, p) => sum + (p.custoTotal || 0), 0);
    const totalPreco = produtosLista.reduce((sum, p) => sum + (p.precoVenda || 0), 0);
    const mediaCusto = produtosLista.length > 0 ? totalCMV / produtosLista.length : 0;
    const mediaPreco = produtosLista.length > 0 ? totalPreco / produtosLista.length : 0;
    const produtosDefasados = produtosLista.filter(p => {
        const pvIdeal = (p.custoTotal || 0) / 0.33;
        return (p.precoVenda || 0) < pvIdeal;
    }).length;
    
    const margemRealMedia = produtosLista.reduce((sum, p) => {
        const margem = (p.precoVenda || 0) - ((p.custoTotal || 0) + (p.precoVenda || 0) * (config.simples / 100) + (p.precoVenda || 0) * (config.cartao / 100));
        return sum + (margem / (p.precoVenda || 1)) * 100;
    }, 0) / (produtosLista.length || 1);
    
    const resumoDiv = document.getElementById('resumoCardapio');
    resumoDiv.innerHTML = `
        <div class="resumo-item">
            <label>📊 Total de Produtos</label>
            <div class="valor">${produtosLista.length}</div>
        </div>
        <div class="resumo-item">
            <label>💰 CMV Médio</label>
            <div class="valor">R$ ${mediaCusto.toFixed(2)}</div>
        </div>
        <div class="resumo-item">
            <label>💵 Preço Médio</label>
            <div class="valor">R$ ${mediaPreco.toFixed(2)}</div>
        </div>
        <div class="resumo-item">
            <label>⚠️ Produtos Defasados</label>
            <div class="valor" style="color: ${produtosDefasados > 0 ? '#dc3545' : '#28a745'}">${produtosDefasados}</div>
        </div>
        <div class="resumo-item">
            <label>📈 Margem Real Média</label>
            <div class="valor">${margemRealMedia.toFixed(1)}%</div>
        </div>
    `;
}

function exportarCSV() {
    const config = getConfig();
    let csvContent = "Categoria;Produto;CMV;Qtd;CMV Total;Preço Venda;Margem Contrib.;% Custo;% Margem;Simples;Cartão;CET;Margem Real;Margem Real %;CMV Ideal;Lucro Est. %;Déficit/Superávit;PV Ideal;Status\n";
    
    produtos.forEach(produto => {
        const indicadores = calcularIndicadores(produto, config);
        csvContent += `"${produto.categoria || '-'}";"${produto.nome}";${indicadores.cmv.toFixed(2)};${config.quantidade};${indicadores.cmvTotal.toFixed(2)};${produto.precoVenda.toFixed(2)};${indicadores.margemContribuicao.toFixed(2)};${indicadores.percentualCusto.toFixed(1)}%;${indicadores.percentualMargem.toFixed(1)}%;${indicadores.impostoSimples.toFixed(2)};${indicadores.taxaCartao.toFixed(2)};${indicadores.cet.toFixed(2)};${indicadores.margemReal.toFixed(2)};${indicadores.margemRealPercentual.toFixed(1)}%;${indicadores.cmvIdeal.toFixed(2)};${indicadores.margemRealPercentual.toFixed(1)}%;${indicadores.deficitSuperavit >= 0 ? 'Superávit' : 'Déficit'} ${Math.abs(indicadores.deficitSuperavit).toFixed(2)};${indicadores.pvIdeal.toFixed(2)};${indicadores.statusPrecificacao}\n`;
    });
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "cardapio_gerencial.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Cardápio carregado!");
    carregarProdutos();
    
    const filtroSetor = document.getElementById('filtroSetor');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroBusca = document.getElementById('filtroBusca');
    const btnExportar = document.getElementById('btnExportar');
    
    if (filtroSetor) filtroSetor.addEventListener('change', aplicarFiltros);
    if (filtroCategoria) filtroCategoria.addEventListener('change', aplicarFiltros);
    if (filtroBusca) filtroBusca.addEventListener('input', aplicarFiltros);
    if (btnExportar) btnExportar.addEventListener('click', exportarCSV);
    
    const modalConfig = document.getElementById('modalConfig');
    const btnConfig = document.getElementById('btnConfig');
    const btnFecharConfig = document.getElementById('btnFecharConfig');
    const btnSalvarConfig = document.getElementById('btnSalvarConfig');
    
    if (btnConfig) {
        btnConfig.onclick = () => {
            const config = getConfig();
            document.getElementById('configSimples').value = config.simples;
            document.getElementById('configCartao').value = config.cartao;
            document.getElementById('configQuantidade').value = config.quantidade;
            if (modalConfig) modalConfig.style.display = 'flex';
        };
    }
    
    if (btnFecharConfig) {
        btnFecharConfig.onclick = () => {
            if (modalConfig) modalConfig.style.display = 'none';
        };
    }
    
    if (btnSalvarConfig) {
        btnSalvarConfig.onclick = () => {
            const simples = parseFloat(document.getElementById('configSimples').value);
            const cartao = parseFloat(document.getElementById('configCartao').value);
            const quantidade = parseInt(document.getElementById('configQuantidade').value);
            salvarConfig(simples, cartao, quantidade);
            if (modalConfig) modalConfig.style.display = 'none';
            aplicarFiltros();
        };
    }
    
    window.onclick = (e) => {
        if (e.target === modalConfig && modalConfig) modalConfig.style.display = 'none';
    };
});