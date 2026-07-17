import { getAuthClaims, parseGroupsClaim } from "../../src/middlewares/auth";

describe("parseGroupsClaim", () => {
  it("faz parse de claim no formato JSON (\"[admin]\")", () => {
    expect(parseGroupsClaim("[admin]")).toEqual(["admin"]);
  });

  it("faz parse de claim separada por vírgula", () => {
    expect(parseGroupsClaim("professor,admin")).toEqual(["professor", "admin"]);
  });

  it("ignora valores fora do domínio de papéis conhecidos", () => {
    expect(parseGroupsClaim("[admin, desconhecido]")).toEqual(["admin"]);
  });

  it("retorna vazio quando não há claim", () => {
    expect(parseGroupsClaim(undefined)).toEqual([]);
  });
});

describe("getAuthClaims", () => {
  const originalStage = process.env.STAGE;

  afterEach(() => {
    process.env.STAGE = originalStage;
  });

  it("lê claims da JWT authorizer nativa do HTTP API", () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: "cognito-sub-123",
              email: "admin@aquarela.com",
              "cognito:groups": "[admin]",
            },
          },
        },
      },
    };

    expect(getAuthClaims(event)).toEqual({
      sub: "cognito-sub-123",
      email: "admin@aquarela.com",
      groups: ["admin"],
      role: "admin",
    });
  });

  it("usa o fallback de headers x-dev-* em stage dev quando não há claims", () => {
    process.env.STAGE = "dev";

    const event = {
      headers: {
        "x-dev-sub": "usuario-local",
        "x-dev-role": "professor",
        "x-dev-email": "professor@aquarela.com",
      },
    };

    expect(getAuthClaims(event)).toEqual({
      sub: "usuario-local",
      email: "professor@aquarela.com",
      groups: ["professor"],
      role: "professor",
    });
  });

  it("nunca usa o fallback de headers em stage prod", () => {
    process.env.STAGE = "prod";

    const event = {
      headers: {
        "x-dev-sub": "usuario-local",
        "x-dev-role": "admin",
      },
    };

    expect(getAuthClaims(event)).toBeNull();
  });

  it("retorna null quando não há claims nem fallback aplicável", () => {
    expect(getAuthClaims({})).toBeNull();
  });
});
