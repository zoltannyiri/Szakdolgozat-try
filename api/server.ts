import express from 'express';
import { Request, Response } from 'express-serve-static-core';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Ellenőrizzük a JWT_SECRET meglétét
if (!process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

const app = express();
app.use(express.json());
app.use(cors());

interface User {
    username: string;
    password: string;
}

const users: User[] = [{ username: 'admin', password: 'password123' }];

app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Hibás bejelentkezési adatok!' });
    }

    const token = jwt.sign(
        { username }, 
        process.env['JWT_SECRET'] as string, 
        { expiresIn: '1h' }
    );
    
    return res.json({ token });
});

const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));