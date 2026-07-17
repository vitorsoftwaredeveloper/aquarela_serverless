import { APIGatewayProxyResult } from "aws-lambda";
import { sendSuccessResponse } from "../../utils/http";

export const execute = async (): Promise<APIGatewayProxyResult> =>
  sendSuccessResponse({
    status: "ok",
    stage: process.env.STAGE ?? "local",
    timestamp: new Date().toISOString(),
  });
