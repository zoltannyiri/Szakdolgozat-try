import express from "express";
import cors from "cors";
import mongoose from "mongoose";

export default class App {
    public app: express.Application;
    private mongoUrl: string = process.env.MONGO_DB_URL ?? "mongodb+srv://zoltannyiri:testpw02@loophub.s8igs.mongodb.net/?retryWrites=true&w=majority&appName=LoopHub";

    constructor(controllers: any[]) {
        this.app = express();
        this.app.use(express.json());
        this.app.use(cors());

        this.connectToTheDatabase().then(() => {
            this.listen();
        });

        controllers.forEach(controller => {
            this.app.use("/api", controller);
        });
    }

    public listen(): void {
        this.app.listen(8000, () => {
            console.log("🚀 Backend fut a 8000-es porton!");
        });
    }

    private async connectToTheDatabase() {
        mongoose.set("strictQuery", true);
        try {
            await mongoose.connect(this.mongoUrl, { connectTimeoutMS: 10000 });
            console.log("✅ MongoDB csatlakoztatva");
        } catch (error: any) {
            console.error("❌ MongoDB hiba:", error.message);
        }
    }
}
