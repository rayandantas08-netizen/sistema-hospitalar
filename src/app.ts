import dotenv from 'dotenv';
dotenv.config();

import express, {Request, Response} from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import {router} from './modulo';

const app = express();

// CORS - libera GitHub Pages e localhost para teste
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rayandantas08-netizen.github.io',
];

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (Postman, curl, mobile)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.github.io')) {
            return callback(null, true);
        }
        // Em desenvolvimento, libera tudo
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(null, true); // libera geral por enquanto para facilitar teste
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// API routes
app.use('/api', router);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'API do Sistema Hospitalar está rodando!',
        timestamp: new Date().toISOString(),
        supabaseConfigured: !!process.env.SUPABASE_URL
    });
});

app.get('/', (req: Request, res: Response) => {
    // Se existe frontend buildado, serve o index.html
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    const frontendDistAlt = path.join(__dirname, 'frontend', 'dist', 'index.html');
    
    if (fs.existsSync(frontendDist)) {
        res.sendFile(frontendDist);
    } else if (fs.existsSync(frontendDistAlt)) {
        res.sendFile(frontendDistAlt);
    } else {
        res.json({
            message: 'API do Sistema Hospitalar está rodando!',
            docs: '/api',
            health: '/health',
            frontend: 'Frontend não encontrado. Rode npm run build no frontend/'
        });
    }
});

// Servir frontend estático se existir (para rodar tudo junto)
const possibleFrontendPaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(process.cwd(), 'frontend', 'dist')
];

for (const frontendPath of possibleFrontendPaths) {
    if (fs.existsSync(frontendPath)) {
        console.log(`📁 Servindo frontend estático de: ${frontendPath}`);
        app.use(express.static(frontendPath));
        // SPA fallback - qualquer rota não-API volta pro index.html
        app.get(/^(?!\/api).*/, (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
        break;
    }
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
        console.log(`🔑 Supabase Keys: ${process.env.SUPABASE_KEY ? '✅' : '❌'} / ${process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌'}`);
        console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
    });
}

export default app;