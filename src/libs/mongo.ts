import mongoose from "mongoose";
import { getSsmParameter } from "./ssm";

let connection: typeof mongoose | null = null;

const resolveConnectionString = async (): Promise<string> => {
  const dbEnv = process.env.DB as string;

  // Local/dev usa a connection string direta; staging/prod recebem o NOME
  // do parâmetro no SSM e buscam o valor em runtime (fora do env em texto
  // plano).
  if (dbEnv.startsWith("mongodb")) {
    return dbEnv;
  }

  return getSsmParameter(dbEnv);
};

export const db = async (): Promise<typeof mongoose | undefined> => {
  try {
    if (connection) {
      console.log("db connection reused");
      return connection;
    }

    const connectionString = await resolveConnectionString();
    connection = await mongoose.connect(connectionString);
    console.log("connection database successful");
    return connection;
  } catch (err) {
    console.log("connection database error", err);
    throw err;
  }
};
