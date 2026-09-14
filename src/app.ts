import express, {Request, Response} from 'express';
import cors from 'cors';
import {router} from './modulo';

const app = express();

app.use(cors(
    {origin: '*'}
));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.use('/api', router);


app.get('/', (req: Request, res: Response) => {
    res.json({message: 'API do Sistema Hospitalar está rodando!'});
});

// Healthcheck usado pelo Render (e pelo workflow ping.yml) para saber se o
// serviço está vivo. Precisa responder rápido e sem tocar no banco.
app.get('/healthz', (req: Request, res: Response) => {
    res.status(200).json({status: 'ok', uptime: process.uptime()});
});


const PORT = Number(process.env.PORT) || 3000;
// 0.0.0.0 garante que o processo escuta na interface externa do container
// (Render, Docker etc.), e não apenas em localhost.
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    console.log(`Servidor rodando em ${HOST}:${PORT}`);
});

// Encerramento gracioso: o Render envia SIGTERM antes de derrubar o instance.
const shutdown = (signal: string) => {
    console.log(`Recebido ${signal}, encerrando o servidor...`);
    server.close(() => process.exit(0));
    // Se algo travar o fechamento, força a saída para o deploy não ficar pendurado.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;