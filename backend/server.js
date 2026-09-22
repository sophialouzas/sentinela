const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ===============================
// CONFIGURAÇÕES
// ===============================

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

// ===============================
// BANCO DE DADOS
// ===============================

const DB_PATH = path.join(__dirname, "db.json");

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const bancoInicial = {
        usuarios: [],
        pacientes: [],
        triagens: [],
        consultas: [],
        medicacoes: [],
        tv_chamada: null,
        tv_historico: [],
        altas: []
      };

      fs.writeFileSync(
        DB_PATH,
        JSON.stringify(bancoInicial, null, 2),
        "utf8"
      );

      return bancoInicial;
    }

    const arquivo = fs.readFileSync(DB_PATH, "utf8");

    const db = arquivo.trim() === "" ? {} : JSON.parse(arquivo);

    // Garante que todas as listas existam
    if (!Array.isArray(db.usuarios)) db.usuarios = [];
    if (!Array.isArray(db.pacientes)) db.pacientes = [];
    if (!Array.isArray(db.triagens)) db.triagens = [];
    if (!Array.isArray(db.consultas)) db.consultas = [];
    if (!Array.isArray(db.medicacoes)) db.medicacoes = [];
    if (!Array.isArray(db.tv_historico)) db.tv_historico = [];
    if (!Array.isArray(db.altas)) db.altas = [];

    if (!Object.prototype.hasOwnProperty.call(db, "tv_chamada")) {
      db.tv_chamada = null;
    }

    return db;
  } catch (error) {
    console.error("Erro ao ler o banco de dados:", error);

    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      medicacoes: [],
      tv_chamada: null,
      tv_historico: [],
      altas: []
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(db, null, 2),
    "utf8"
  );
}

function gerarId(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return 1;
  }

  const ids = lista
    .map(item => Number(item.id))
    .filter(id => !isNaN(id));

  if (ids.length === 0) {
    return 1;
  }

  return Math.max(...ids) + 1;
}

// ===============================
// ROTA INICIAL
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ===============================
// LOGIN
// ===============================

app.post("/login", (req, res) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Preencha usuário e senha."
      });
    }

    const db = readDB();

    const encontrado = db.usuarios.find(user => {
      return (
        String(user.usuario).toLowerCase() === String(usuario).toLowerCase() &&
        String(user.senha) === String(senha)
      );
    });

    if (!encontrado) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Usuário ou senha incorretos."
      });
    }

    return res.json({
      sucesso: true,
      mensagem: "Login realizado com sucesso.",
      usuario: {
        id: encontrado.id,
        nome: encontrado.nome,
        usuario: encontrado.usuario,
        tipo: encontrado.tipo
      }
    });

  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao realizar login."
    });
  }
});

// ===============================
// CADASTRO DE PACIENTE
// ===============================

app.post("/atendimento", (req, res) => {
  try {
    const {
      nome,
      cpf,
      nascimento,
      telefone,
      endereco,
      convenio,
      observacoes
    } = req.body;

    if (!nome || !cpf || !nascimento) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nome, CPF e data de nascimento são obrigatórios."
      });
    }

    const db = readDB();

    const cpfExistente = db.pacientes.find(
      paciente => String(paciente.cpf) === String(cpf)
    );

    if (cpfExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Já existe um paciente cadastrado com este CPF."
      });
    }

    const novoPaciente = {
      id: gerarId(db.pacientes),
      nome,
      cpf,
      nascimento,
      telefone: telefone || "",
      endereco: endereco || "",
      convenio: convenio || "",
      observacoes: observacoes || "",
      criadoEm: new Date().toISOString()
    };

    db.pacientes.push(novoPaciente);
    saveDB(db);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Paciente cadastrado com sucesso.",
      paciente: novoPaciente
    });
  } catch (error) {
    console.error("Erro ao cadastrar paciente:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao cadastrar paciente."
    });
  }
});

// ===============================
// LISTAR PACIENTES
// ===============================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.pacientes);
  } catch (error) {
    console.error("Erro ao listar pacientes:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar pacientes."
    });
  }
});

// ===============================
// BUSCAR PACIENTE POR ID
// ===============================

app.get("/pacientes/:id", (req, res) => {
  try {
    const db = readDB();

    const paciente = db.pacientes.find(
      item => String(item.id) === String(req.params.id)
    );

    if (!paciente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Paciente não encontrado."
      });
    }

    return res.json(paciente);
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar paciente."
    });
  }
});

// ===============================
// TRIAGEM
// ===============================

app.post("/triagem", (req, res) => {
  try {
    const {
      pacienteId,
      paciente,
      pressao,
      temperatura,
      saturacao,
      frequencia,
      sintomas,
      observacoes,
      prioridade
    } = req.body;

    if (!pacienteId && !paciente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o paciente."
      });
    }

    const db = readDB();

    const novaTriagem = {
      id: gerarId(db.triagens),
      pacienteId: pacienteId || "",
      paciente: paciente || "",
      pressao: pressao || "",
      temperatura: temperatura || "",
      saturacao: saturacao || "",
      frequencia: frequencia || "",
      sintomas: sintomas || "",
      observacoes: observacoes || "",
      prioridade: prioridade || "Normal",
      status: "Aguardando atendimento",
      criadoEm: new Date().toISOString()
    };

    db.triagens.push(novaTriagem);
    saveDB(db);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Triagem registrada com sucesso.",
      triagem: novaTriagem
    });
  } catch (error) {
    console.error("Erro ao registrar triagem:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao registrar triagem."
    });
  }
});

// ===============================
// LISTAR TRIAGENS
// ===============================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.triagens);
  } catch (error) {
    console.error("Erro ao listar triagens:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar triagens."
    });
  }
});

// ===============================
// ATUALIZAR STATUS DA TRIAGEM
// ===============================

app.put("/triagem/:id", (req, res) => {
  try {
    const { status, prioridade } = req.body;

    const db = readDB();

    const triagem = db.triagens.find(
      item => String(item.id) === String(req.params.id)
    );

    if (!triagem) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Triagem não encontrada."
      });
    }

    if (status !== undefined) {
      triagem.status = status;
    }

    if (prioridade !== undefined) {
      triagem.prioridade = prioridade;
    }

    triagem.atualizadoEm = new Date().toISOString();

    saveDB(db);

    return res.json({
      sucesso: true,
      mensagem: "Triagem atualizada com sucesso.",
      triagem
    });
  } catch (error) {
    console.error("Erro ao atualizar triagem:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao atualizar triagem."
    });
  }
});

// ===============================
// CHAMADA DE TV
// ===============================

app.post("/tv/chamar", (req, res) => {
  try {
    const {
      senha,
      paciente,
      consultorio,
      tipo
    } = req.body;

    if (!senha || !paciente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Senha e paciente são obrigatórios."
      });
    }

    const db = readDB();

    const chamada = {
      id: gerarId(db.tv_historico),
      senha,
      paciente,
      consultorio: consultorio || "",
      tipo: tipo || "Consulta",
      criadoEm: new Date().toISOString()
    };

    db.tv_chamada = chamada;
    db.tv_historico.push(chamada);

    saveDB(db);

    return res.json({
      sucesso: true,
      mensagem: "Paciente chamado com sucesso.",
      chamada
    });
  } catch (error) {
    console.error("Erro ao chamar paciente:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao chamar paciente."
    });
  }
});

// ===============================
// CONSULTAR CHAMADA ATUAL DA TV
// ===============================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.tv_chamada);
  } catch (error) {
    console.error("Erro ao buscar chamada da TV:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar chamada atual."
    });
  }
});

// ===============================
// HISTÓRICO DA TV
// ===============================

app.get("/tv/historico", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.tv_historico);
  } catch (error) {
    console.error("Erro ao buscar histórico da TV:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar histórico da TV."
    });
  }
});

// ===============================
// LISTA DE MEDICAÇÕES
// ===============================

app.get("/lista-medicacoes", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.medicacoes);
  } catch (error) {
    console.error("Erro ao listar medicações:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar medicações."
    });
  }
});

// ===============================
// CADASTRAR MEDICAÇÃO
// ===============================

app.post("/lista-medicacoes", (req, res) => {
  try {
    const {
      nome,
      dosagem,
      quantidade,
      observacoes
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o nome da medicação."
      });
    }

    const db = readDB();

    const novaMedicacao = {
      id: gerarId(db.medicacoes),
      nome,
      dosagem: dosagem || "",
      quantidade: quantidade || "",
      observacoes: observacoes || "",
      criadoEm: new Date().toISOString()
    };

    db.medicacoes.push(novaMedicacao);
    saveDB(db);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Medicação cadastrada com sucesso.",
      medicacao: novaMedicacao
    });
  } catch (error) {
    console.error("Erro ao cadastrar medicação:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao cadastrar medicação."
    });
  }
});

// ===============================
// CONSULTAS MÉDICAS
// ===============================

app.post("/consulta", (req, res) => {
  try {
    const {
      pacienteId,
      paciente,
      medico,
      especialidade,
      diagnostico,
      observacoes,
      data,
      horario
    } = req.body;

    if (!pacienteId && !paciente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o paciente da consulta."
      });
    }

    const db = readDB();

    const novaConsulta = {
      id: gerarId(db.consultas),
      pacienteId: pacienteId || "",
      paciente: paciente || "",
      medico: medico || "",
      especialidade: especialidade || "",
      diagnostico: diagnostico || "",
      observacoes: observacoes || "",
      data: data || "",
      horario: horario || "",
      status: "Realizada",
      criadoEm: new Date().toISOString()
    };

    db.consultas.push(novaConsulta);
    saveDB(db);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Consulta registrada com sucesso.",
      consulta: novaConsulta
    });
  } catch (error) {
    console.error("Erro ao registrar consulta:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao registrar consulta."
    });
  }
});

// ===============================
// LISTAR CONSULTAS
// ===============================

app.get("/consultas", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.consultas);
  } catch (error) {
    console.error("Erro ao listar consultas:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar consultas."
    });
  }
});

// ===============================
// ALTA MÉDICA
// ===============================

app.post("/alta", (req, res) => {
  try {
    const {
      pacienteId,
      paciente,
      diagnostico,
      orientacoes,
      retorno,
      observacoes
    } = req.body;

    if (!pacienteId && !paciente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o paciente para registrar a alta."
      });
    }

    if (!diagnostico || String(diagnostico).trim() === "") {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o diagnóstico do paciente."
      });
    }

    const db = readDB();

    const dadosAlta = {
      pacienteId: pacienteId || "",
      paciente: paciente || "",
      diagnostico: diagnostico || "",
      orientacoes: orientacoes || "",
      retorno: retorno || "",
      observacoes: observacoes || "",
      dataAlta: new Date().toISOString()
    };

    // Se já existir uma alta para o paciente,
    // atualiza a alta em vez de retornar erro.
    const altaExistente = db.altas.find(item => {
      return String(item.pacienteId) === String(pacienteId);
    });

    if (altaExistente) {
      Object.assign(altaExistente, dadosAlta);

      saveDB(db);

      return res.json({
        sucesso: true,
        atualizada: true,
        mensagem: "Alta atualizada com sucesso.",
        alta: altaExistente
      });
    }

    const novaAlta = {
      id: gerarId(db.altas),
      ...dadosAlta
    };

    db.altas.push(novaAlta);

    saveDB(db);

    return res.status(201).json({
      sucesso: true,
      atualizada: false,
      mensagem: "Alta registrada com sucesso.",
      alta: novaAlta
    });
  } catch (error) {
    console.error("Erro ao registrar alta:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao registrar alta."
    });
  }
});

// ===============================
// LISTAR ALTAS
// ===============================

app.get("/altas", (req, res) => {
  try {
    const db = readDB();

    return res.json(db.altas);
  } catch (error) {
    console.error("Erro ao listar altas:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar altas."
    });
  }
});

// ===============================
// BUSCAR ALTA POR ID DO PACIENTE
// ===============================

app.get("/alta/:pacienteId", (req, res) => {
  try {
    const db = readDB();

    const alta = db.altas.find(item => {
      return String(item.pacienteId) === String(req.params.pacienteId);
    });

    if (!alta) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Alta não encontrada para este paciente."
      });
    }

    return res.json(alta);
  } catch (error) {
    console.error("Erro ao buscar alta:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar alta."
    });
  }
});

// ===============================
// EXCLUIR ALTA
// ===============================

app.delete("/alta/:id", (req, res) => {
  try {
    const db = readDB();

    const indice = db.altas.findIndex(item => {
      return String(item.id) === String(req.params.id);
    });

    if (indice === -1) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Alta não encontrada."
      });
    }

    const removida = db.altas.splice(indice, 1)[0];

    saveDB(db);

    return res.json({
      sucesso: true,
      mensagem: "Alta excluída com sucesso.",
      alta: removida
    });
  } catch (error) {
    console.error("Erro ao excluir alta:", error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao excluir alta."
    });
  }
});

// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, () => {
  console.log("====================================");
  console.log("Sistema hospitalar iniciado!");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/index.html`);
  console.log("====================================");
});
