import firebase from "firebase/compat/app";
import "firebase/compat/database";
import { ensureFirebaseInitialized } from "./firebase";

const waitForConnection = async (db, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const connectedRef = db.ref(".info/connected");
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        reject(
          new Error("Tempo limite excedido esperando conexão com Firebase")
        );
      }
    }, timeout);

    connectedRef.once("value", (snapshot) => {
      if (snapshot.val() === true) {
        clearTimeout(timeoutId);
        resolved = true;
        resolve(db);
      } else {
        db.goOnline();
        connectedRef.on("value", (snap) => {
          if (snap.val() === true) {
            clearTimeout(timeoutId);
            resolved = true;
            connectedRef.off();
            resolve(db);
          }
        });
      }
    });
  });
};

export const adicionarMesaNoFirebase = async (mesa) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  console.log("(NOBRIDGE) LOG Adicionando mesa ao Firebase:", mesa);
  return freshDb
    .ref("mesas")
    .push({ ...mesa, createdAt: firebase.database.ServerValue.TIMESTAMP }).key;
};

export const getMesas = (callback) => {
  let ref;
  const setupListener = async () => {
    const freshDb = await ensureFirebaseInitialized();
    if (!freshDb) {
      console.error(
        "(NOBRIDGE) ERROR Firebase DB não inicializado em getMesas"
      );
      callback([]);
      return;
    }
    ref = freshDb.ref("mesas");
    ref.on(
      "value",
      (snapshot) => {
        const data = snapshot.val();
        console.log("(NOBRIDGE) LOG Mesas recebidas:", data);
        callback(
          data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : []
        );
      },
      (error) => {
        console.error("(NOBRIDGE) ERROR Erro em getMesas:", error);
        callback([]);
      }
    );
  };
  setupListener();
  return () => {
    if (ref) {
      console.log("(NOBRIDGE) LOG Desmontando listener de mesas");
      ref.off("value");
    }
  };
};

export const getPedidos = (callback) => {
  let ref;
  const setupListener = async () => {
    const freshDb = await ensureFirebaseInitialized();
    if (!freshDb) {
      console.error(
        "(NOBRIDGE) ERROR Firebase DB não inicializado em getPedidos"
      );
      callback([]);
      return;
    }
    ref = freshDb.ref("pedidos");
    ref.on(
      "value",
      (snapshot) => {
        const data = snapshot.val();
        console.log("(NOBRIDGE) LOG Pedidos recebidos:", data);
        callback(
          data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : []
        );
      },
      (error) => {
        console.error("(NOBRIDGE) ERROR Erro em getPedidos:", error);
        callback([]);
      }
    );
  };
  setupListener();
  return () => {
    if (ref) {
      console.log("(NOBRIDGE) LOG Desmontando listener de pedidos");
      ref.off("value");
    }
  };
};

export const atualizarMesa = async (mesaId, updates) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  if (!freshDb) {
    console.error(
      "(NOBRIDGE) ERROR Firebase DB não inicializado em atualizarMesa"
    );
    throw new Error("Firebase DB não inicializado.");
  }
  try {
    const ref = freshDb.ref(`mesas/${mesaId}`);
    if (!ref) {
      console.error("(NOBRIDGE) ERROR Referência inválida para mesa:", mesaId);
      throw new Error("Referência ao Firebase inválida.");
    }
    if (updates === null) {
      console.log("(NOBRIDGE) LOG Removendo mesa:", mesaId);
      await ref.remove();
    } else {
      console.log("(NOBRIDGE) LOG Atualizando mesa:", mesaId, updates);
      await ref.update(updates);
    }
    console.log("(NOBRIDGE) LOG Mesa atualizada com sucesso:", mesaId);
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao atualizar/remover mesa:", error);
    throw error;
  }
};

export const juntarMesas = async (mesaId1, mesaId2) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    const refMesa1 = freshDb.ref(`mesas/${mesaId1}`);
    const refMesa2 = freshDb.ref(`mesas/${mesaId2}`);
    const snapshotMesa1 = await refMesa1.once("value");
    const snapshotMesa2 = await refMesa2.once("value");

    const mesa1 = snapshotMesa1.val();
    const mesa2 = snapshotMesa2.val();

    if (!mesa1 || !mesa2) {
      throw new Error("Uma ou ambas as mesas não foram encontradas.");
    }

    const novoNumero = `${mesa1.numero}-${mesa2.numero}`;
    const novoNomeCliente = `${mesa1.nomeCliente} & ${mesa2.nomeCliente}`;

    const pedidosSnapshot = await freshDb.ref("pedidos").once("value");
    const todosPedidos = pedidosSnapshot.val() || {};
    const pedidosMesa1 = Object.entries(todosPedidos)
      .filter(([_, pedido]) => pedido.mesa === mesa1.numero)
      .map(([id, pedido]) => ({ id, ...pedido, mesaOriginal: mesa1.numero }));
    const pedidosMesa2 = Object.entries(todosPedidos)
      .filter(([_, pedido]) => pedido.mesa === mesa2.numero)
      .map(([id, pedido]) => ({ id, ...pedido, mesaOriginal: mesa2.numero }));

    const novaMesa = {
      numero: novoNumero,
      nomeCliente: novoNomeCliente,
      posX: mesa1.posX || 0,
      posY: mesa1.posY || 0,
      status: "aberta",
      createdAt: mesa1.createdAt,
    };

    const updates = {};
    [...pedidosMesa1, ...pedidosMesa2].forEach((pedido) => {
      updates[`pedidos/${pedido.id}/mesa`] = novoNumero;
      if (!pedido.mesaOriginal) {
        updates[`pedidos/${pedido.id}/mesaOriginal`] = pedido.mesa;
      }
    });
    updates[`mesas/${mesaId1}`] = novaMesa;
    updates[`mesas/${mesaId2}`] = null;

    await freshDb.ref().update(updates);
    console.log(
      "(NOBRIDGE) LOG Mesas juntadas com sucesso:",
      novoNumero,
      "Pedidos combinados:",
      [...pedidosMesa1, ...pedidosMesa2]
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao juntar mesas:", error);
    throw error;
  }
};

export const adicionarPedido = async (mesaNumero, itens) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    const pedido = {
      mesa: mesaNumero,
      itens,
      status: "aguardando",
      entregue: false,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    };
    console.log("(NOBRIDGE) LOG Adicionando pedido:", pedido);
    const pedidoId = await freshDb.ref("pedidos").push(pedido).key;
    console.log("(NOBRIDGE) LOG Pedido adicionado com sucesso:", pedidoId);
    return pedidoId;
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao adicionar pedido:", error);
    throw error;
  }
};

export const getEstoque = (callback) => {
  let ref;
  const setupListener = async () => {
    const freshDb = await ensureFirebaseInitialized();
    ref = freshDb.ref("estoque");
    ref.on(
      "value",
      (snapshot) => {
        const data = snapshot.val();
        console.log("(NOBRIDGE) LOG Estoque recebido:", data);
        callback(
          data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : []
        );
      },
      (error) => {
        console.error("(NOBRIDGE) ERROR Erro em getEstoque:", error);
        callback([]);
      }
    );
  };
  setupListener();
  return () => {
    if (ref) {
      console.log("(NOBRIDGE) LOG Desmontando listener de estoque");
      ref.off("value");
    }
  };
};

export const getCardapio = (callback) => {
  let ref;
  const setupListener = async () => {
    const freshDb = await ensureFirebaseInitialized();
    ref = freshDb.ref("cardapio");
    ref.on(
      "value",
      (snapshot) => {
        const data = snapshot.val();
        console.log("(NOBRIDGE) LOG Cardápio recebido em mesaService:", data);
        if (data) {
          const itens = [];
          Object.entries(data).forEach(([categoria, subItens]) => {
            Object.values(subItens).forEach((item) => {
              itens.push({
                nome: item.nome,
                precoUnitario: item.precoUnitario || 0,
                imagens: item.imagens || [],
                categoria: categoria.replace(/_/g, " "),
                descrição: item.descrição || "",
              });
            });
          });
          callback(itens);
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error("(NOBRIDGE) ERROR Erro em getCardapio:", error);
        callback([]);
      }
    );
  };
  setupListener();
  return () => {
    if (ref) {
      console.log("(NOBRIDGE) LOG Desmontando listener de cardápio");
      ref.off("value");
    }
  };
};

const COMBOS_SUBITENS = {
  "Combo Energético": [
    { nome: "Água de coco", quantidade: 1 },
    { nome: "RedBull", quantidade: 1 },
    { nome: "Coca-Cola", quantidade: 1 },
  ],
  "Combo caipirinha": [
    { nome: "Água de coco", quantidade: 1 },
    { nome: "RedBull", quantidade: 1 },
    { nome: "Coca-Cola", quantidade: 1 },
  ],
};

export const atualizarStatusPedido = async (pedidoId, novoStatus) => {
  const db = await ensureFirebaseInitialized();
  try {
    console.log("(NOBRIDGE) LOG Atualizando status do pedido:", {
      pedidoId,
      novoStatus,
    });
    await db.ref(`pedidos/${pedidoId}`).update({ entregue: novoStatus });

    if (novoStatus === true) {
      const pedidoSnapshot = await db.ref(`pedidos/${pedidoId}`).once("value");
      const pedido = pedidoSnapshot.val();
      console.log("(NOBRIDGE) LOG Dados do pedido recuperado:", pedido);
      const itens = pedido?.itens || [];

      if (!itens.length) {
        console.warn(
          "(NOBRIDGE) WARN Nenhum item encontrado no pedido:",
          pedidoId
        );
        return;
      }

      for (const item of itens) {
        console.log("(NOBRIDGE) LOG Processando item do pedido:", item);
        const { nome, quantidade } = item;

        // Verifica se o item é um combo (baseado no mapeamento fixo)
        if (COMBOS_SUBITENS[nome]) {
          console.log("(NOBRIDGE) LOG Identificado como combo:", nome);
          const subItens = COMBOS_SUBITENS[nome];

          for (const subItem of subItens) {
            const { nome: subItemNome, quantidade: subItemQuantidade } =
              subItem;
            const quantidadeTotal = subItemQuantidade * (quantidade || 1);
            console.log(
              "(NOBRIDGE) LOG Baixando estoque para subitem do combo:",
              {
                nome: subItemNome,
                quantidadeTotal,
              }
            );

            const estoqueSnapshot = await db
              .ref(`estoque/${subItemNome}`)
              .once("value");
            const estoqueData = estoqueSnapshot.val();

            if (estoqueData) {
              const quantidadeAtual = estoqueData.quantidade || 0;
              const novaQuantidade = Math.max(
                quantidadeAtual - quantidadeTotal,
                0
              );

              if (novaQuantidade > 0) {
                await db
                  .ref(`estoque/${subItemNome}`)
                  .update({ quantidade: novaQuantidade });
                console.log("(NOBRIDGE) LOG Estoque atualizado:", {
                  nome: subItemNome,
                  novaQuantidade,
                });
              } else {
                await db.ref(`estoque/${subItemNome}`).remove();
                console.log(
                  "(NOBRIDGE) LOG Item removido do estoque por zerar:",
                  subItemNome
                );
                if (estoqueData.chaveCardapio && estoqueData.categoria) {
                  await db
                    .ref(
                      `cardapio/${estoqueData.categoria}/${estoqueData.chaveCardapio}`
                    )
                    .remove();
                  console.log(
                    "(NOBRIDGE) LOG Item removido do cardápio:",
                    subItemNome
                  );
                }
              }
            } else {
              console.warn(
                "(NOBRIDGE) WARN Item não encontrado no estoque:",
                subItemNome
              );
            }
          }
        } else {
          // Fluxo para itens não-combo
          console.log("(NOBRIDGE) LOG Baixando estoque para item não-combo:", {
            nome,
            quantidade,
          });

          const estoqueSnapshot = await db.ref(`estoque/${nome}`).once("value");
          const estoqueData = estoqueSnapshot.val();

          if (estoqueData) {
            const quantidadeAtual = estoqueData.quantidade || 0;
            const novaQuantidade = Math.max(quantidadeAtual - quantidade, 0);

            if (novaQuantidade > 0) {
              await db
                .ref(`estoque/${nome}`)
                .update({ quantidade: novaQuantidade });
              console.log("(NOBRIDGE) LOG Estoque atualizado:", {
                nome,
                novaQuantidade,
              });
            } else {
              await db.ref(`estoque/${nome}`).remove();
              console.log(
                "(NOBRIDGE) LOG Item removido do estoque por zerar:",
                nome
              );
              if (estoqueData.chaveCardapio && estoqueData.categoria) {
                await db
                  .ref(
                    `cardapio/${estoqueData.categoria}/${estoqueData.chaveCardapio}`
                  )
                  .remove();
                console.log("(NOBRIDGE) LOG Item removido do cardápio:", nome);
              }
            }
          } else {
            console.warn(
              "(NOBRIDGE) WARN Item não encontrado no estoque:",
              nome
            );
          }
        }
      }
    }
    console.log("(NOBRIDGE) LOG Status atualizado com sucesso para:", {
      pedidoId,
      status: novoStatus,
    });
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao atualizar status:", error);
    throw error;
  }
};

export const adicionarNovoItemEstoque = async (
  nome,
  quantidade,
  unidade = "unidades",
  estoqueMinimo = 0
) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    console.log("(NOBRIDGE) LOG Iniciando adição ao estoque:", {
      nome,
      quantidade,
      unidade,
      estoqueMinimo,
    });
    const ref = freshDb.ref(`estoque/${nome}`);
    const snapshot = await ref.once("value");
    const itemExistente = snapshot.val();

    const novaQuantidade = itemExistente
      ? (itemExistente.quantidade || 0) + parseFloat(quantidade)
      : parseFloat(quantidade);

    const itemData = {
      nome,
      quantidade: novaQuantidade,
      unidade: unidade || (itemExistente ? itemExistente.unidade : "unidades"),
      estoqueMinimo:
        parseFloat(estoqueMinimo) ||
        (itemExistente ? itemExistente.estoqueMinimo : 0),
    };

    await ref.set(itemData);
    console.log(
      "(NOBRIDGE) LOG Item adicionado ao estoque com sucesso:",
      itemData
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Falha ao adicionar ao estoque:", error);
    throw error;
  }
};

export const removerEstoque = async (itemId, quantidade) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    console.log("(NOBRIDGE) LOG Tentando remover do estoque:", {
      itemId,
      quantidade,
    });
    const ref = freshDb.ref(`estoque/${itemId}`);
    const snapshot = await ref.once("value");
    const itemExistente = snapshot.val();

    if (!itemExistente) {
      throw new Error(`Item ${itemId} não encontrado no estoque.`);
    }

    const quantidadeAtual = itemExistente.quantidade || 0;
    const novaQuantidade = Math.max(
      0,
      quantidadeAtual - parseFloat(quantidade)
    );

    const itemData = {
      ...itemExistente,
      quantidade: novaQuantidade,
    };

    await ref.set(itemData);
    console.log(
      "(NOBRIDGE) LOG Item removido do estoque com sucesso:",
      itemData
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao remover do estoque:", error);
    throw error;
  }
};

export const adicionarNovoItemCardapio = async (
  nome,
  precoUnitario,
  imagemUrl,
  categoria,
  chaveUnica
) => {
  const db = await ensureFirebaseInitialized();
  try {
    console.log("(NOBRIDGE) LOG Iniciando adição ao cardápio:", {
      nome,
      precoUnitario,
      imagemUrl,
      categoria,
      chaveUnica,
    });

    const itemData = {
      nome,
      precoUnitario: parseFloat(precoUnitario) || 0,
      descrição: "Item adicionado via estoque",
      imagens: imagemUrl ? [imagemUrl] : [],
    };

    await db.ref(`cardapio/${categoria}/${chaveUnica}`).set(itemData);
    console.log(
      "(NOBRIDGE) LOG Item adicionado ao cardápio com sucesso:",
      itemData
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Detalhes do erro no cardápio:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

export const removerItemEstoqueECardapio = async (nomeItem, categoria) => {
  const db = await ensureFirebaseInitialized();
  try {
    const snapshot = await db
      .ref(`estoque/${nomeItem}/chaveCardapio`)
      .once("value");
    const chaveCardapio = snapshot.val();

    if (chaveCardapio) {
      await db.ref(`cardapio/${categoria}/${chaveCardapio}`).remove();
      console.log(`(NOBRIDGE) LOG Item ${nomeItem} removido do cardápio`);
    } else {
      console.log(
        `(NOBRIDGE) LOG Nenhuma entrada no cardápio encontrada para ${nomeItem}`
      );
    }

    await db.ref(`estoque/${nomeItem}`).remove();
    console.log(`(NOBRIDGE) LOG Item ${nomeItem} removido do estoque`);
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao remover item:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

export const atualizarQuantidadeEstoque = async (
  nomeItem,
  novaQuantidade,
  categoria
) => {
  const db = await ensureFirebaseInitialized();
  try {
    await db
      .ref(`estoque/${nomeItem}/quantidade`)
      .set(parseInt(novaQuantidade, 10));
    console.log(
      `(NOBRIDGE) LOG Quantidade de ${nomeItem} atualizada para ${novaQuantidade}`
    );

    if (parseInt(novaQuantidade, 10) <= 0) {
      const snapshot = await db
        .ref(`estoque/${nomeItem}/chaveCardapio`)
        .once("value");
      const chaveCardapio = snapshot.val();

      if (chaveCardapio) {
        await db.ref(`cardapio/${categoria}/${chaveCardapio}`).remove();
        console.log(
          `(NOBRIDGE) LOG Item ${nomeItem} removido do cardápio por quantidade zero`
        );
      }

      await db.ref(`estoque/${nomeItem}`).remove();
      console.log(
        `(NOBRIDGE) LOG Item ${nomeItem} removido do estoque por quantidade zero`
      );
    }
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao atualizar quantidade:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

export const adicionarFichaTecnica = async (
  itemCardapio,
  itemEstoque,
  quantidadePorUnidade
) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    console.log("(NOBRIDGE) LOG Iniciando adição de ficha técnica:", {
      itemCardapio,
      itemEstoque,
      quantidadePorUnidade,
    });
    const ref = freshDb.ref(`fichasTecnicas/${itemCardapio}`);
    const snapshot = await ref.once("value");
    const fichaExistente = snapshot.val() || {};

    const fichaData = {
      ...fichaExistente,
      [itemEstoque]: parseFloat(quantidadePorUnidade) || 1,
    };

    await ref.set(fichaData);
    console.log(
      "(NOBRIDGE) LOG Ficha técnica adicionada com sucesso:",
      fichaData
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Falha ao adicionar ficha técnica:", error);
    throw error;
  }
};

export const fecharMesa = async (mesaId, updates) => {
  const freshDb = await ensureFirebaseInitialized();
  await waitForConnection(freshDb);
  try {
    console.log(
      "(NOBRIDGE) LOG Atualizando mesa para fechamento ou pagamento parcial:",
      { mesaId, updates }
    );
    const ref = freshDb.ref(`mesas/${mesaId}`);
    const snapshot = await ref.once("value");
    if (!snapshot.exists()) {
      throw new Error(`Mesa ${mesaId} não encontrada.`);
    }
    await ref.update(updates);
    console.log(
      "(NOBRIDGE) LOG Mesa atualizada com sucesso para fechamento ou pagamento:",
      mesaId
    );
  } catch (error) {
    console.error(
      "(NOBRIDGE) ERROR Erro ao atualizar mesa para fechamento ou pagamento:",
      error
    );
    throw error;
  }
};

export const enviarComandaViaWhatsApp = (
  mesaNumero,
  pedidos,
  cardapio,
  telefone
) => {
  try {
    console.log("(NOBRIDGE) LOG Gerando texto da comanda para WhatsApp:", {
      mesaNumero,
      pedidos,
      cardapio,
      telefone,
    });

    // Gera o texto da comanda
    let texto = `Conta da Mesa ${mesaNumero}\nItens:\n`;
    pedidos.forEach((pedido) => {
      if (pedido.itens && Array.isArray(pedido.itens)) {
        pedido.itens.forEach((item) => {
          const itemCardapio = cardapio.find((c) => c.nome === item.nome);
          const precoUnitario = itemCardapio ? itemCardapio.precoUnitario : 0;
          texto += `${item.nome} x${
            item.quantidade
          } - R$ ${precoUnitario.toFixed(2)} cada - R$ ${(
            item.quantidade * precoUnitario
          ).toFixed(2)}\n`;
        });
      }
    });

    const total = pedidos.reduce((acc, pedido) => {
      if (pedido.itens && Array.isArray(pedido.itens)) {
        const pedidoTotal = pedido.itens.reduce((sum, item) => {
          const itemCardapio = cardapio.find((c) => c.nome === item.nome);
          const precoUnitario = itemCardapio ? itemCardapio.precoUnitario : 0;
          return sum + item.quantidade * precoUnitario;
        }, 0);
        return acc + pedidoTotal;
      }
      return acc;
    }, 0);

    texto += `\nTotal: R$ ${total.toFixed(2)}`;

    console.log("(NOBRIDGE) LOG Texto da comanda gerado com sucesso:", texto);

    // Formata o número de telefone e cria a URL do WhatsApp
    const numeroLimpo = telefone.replace(/[^\d+]/g, ""); // Remove caracteres indesejados
    const encodedText = encodeURIComponent(texto);
    const whatsappUrl = `whatsapp://send?phone=${numeroLimpo}&text=${encodedText}`;

    console.log("(NOBRIDGE) LOG URL do WhatsApp gerada:", whatsappUrl);
    return whatsappUrl; // Retorna a URL completa
  } catch (error) {
    console.error(
      "(NOBRIDGE) ERROR Erro ao gerar texto da comanda para WhatsApp:",
      error
    );
    throw error;
  }
};

export const removerMesa = async (mesaId) => {
  const freshDb = await ensureFirebaseInitialized();
  try {
    console.log(
      "(NOBRIDGE) LOG Verificando conexão antes de remover mesa:",
      mesaId
    );
    const connectedRef = freshDb.ref(".info/connected");
    const isConnected = await new Promise((resolve) => {
      connectedRef.once("value", (snapshot) => {
        resolve(snapshot.val() === true);
      });
    });
    if (!isConnected) {
      freshDb.goOnline();
      await waitForConnection(freshDb);
    }
    console.log("(NOBRIDGE) LOG Conexão confirmada, removendo mesa:", mesaId);
    const ref = freshDb.ref(`mesas/${mesaId}`);
    await ref.remove();
    console.log(
      "(NOBRIDGE) LOG Mesa removida com sucesso do Firebase:",
      mesaId
    );
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao remover mesa do Firebase:", error);
    throw error;
  }
};

export const removerPedidosDaMesa = async (mesaNumero) => {
  const freshDb = await ensureFirebaseInitialized();
  try {
    console.log("(NOBRIDGE) LOG Removendo pedidos da mesa:", mesaNumero);
    const pedidosSnapshot = await freshDb.ref("pedidos").once("value");
    const todosPedidos = pedidosSnapshot.val() || {};
    const pedidosDaMesa = Object.entries(todosPedidos)
      .filter(([_, pedido]) => pedido.mesa === mesaNumero)
      .map(([id]) => id);

    const updates = {};
    pedidosDaMesa.forEach((pedidoId) => {
      updates[`pedidos/${pedidoId}`] = null; // Remove cada pedido
    });

    if (Object.keys(updates).length > 0) {
      await freshDb.ref().update(updates);
      console.log(
        "(NOBRIDGE) LOG Pedidos removidos com sucesso da mesa:",
        mesaNumero
      );
    } else {
      console.log(
        "(NOBRIDGE) LOG Nenhum pedido encontrado para a mesa:",
        mesaNumero
      );
    }
  } catch (error) {
    console.error("(NOBRIDGE) ERROR Erro ao remover pedidos da mesa:", error);
    throw error;
  }
};
