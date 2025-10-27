import mongoose, { Schema, Document } from "mongoose";


export interface ICreditConfig extends Document {
initialCreditsForNewUser: number;
bonusOnVerify: number;
creditsPerApprovedUpload: number;
downloadCost: number;
rewardPerDownloadToUploader: number;
updatedAt: Date;
}


const CreditConfigSchema = new Schema<ICreditConfig>({
    initialCreditsForNewUser: { 
        type: Number, 
        default: 0 
    },
    bonusOnVerify: { 
        type: Number, default: 2 
    },
    creditsPerApprovedUpload: { 
        type: Number, 
        default: 2 
    },
    downloadCost: { 
        type: Number, 
        default: 1 
    },
    rewardPerDownloadToUploader: { 
        type: Number, 
        default: 0 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
});


export default mongoose.model<ICreditConfig>("CreditConfig", CreditConfigSchema);