//joyina
import { Router } from "express";
import { body, validationResult, query } from "express-validator";
import { Pool } from "mysql2/promise";
import { AuthController } from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";
import { verifyRefreshTokenPayload } from "../utils/jwt";

const router = Router();

// Validaciones
const loginValidation = [
  body("email").isEmail().withMessage("Email inválido"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
];

const strongPasswordMsg =
  "La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial";
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const registerValidation = [
  body("nombre").notEmpty().withMessage("El nombre es requerido"),
  body("email").isEmail().withMessage("Email inválido"),
  body("password").matches(strongPasswordRegex).withMessage(strongPasswordMsg),
  body("rol")
    .isIn(["admin", "empleado", "cliente"])
    .withMessage("Rol inválido"),
];

const forgotValidation = [
  body("email").isEmail().withMessage("Email inválido"),
];

const resetValidation = [
  body("token").isString().notEmpty().withMessage("Token requerido"),
  body("newPassword")
    .matches(strongPasswordRegex)
    .withMessage(strongPasswordMsg),
];

const verifyEmailValidation = [
  query("token").optional().isString().withMessage("Token inválido"),
  body("token").optional().isString().withMessage("Token inválido"),
];

// Middleware para validar entrada y pasar al controlador
const validateAndPassToController = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Datos de entrada inválidos",
      details: errors.array(),
    });
  }
  next();
};

// Login
router.post(
  "/login",
  loginValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.login(req, res);
  }
);

// Registro
router.post(
  "/register",
  registerValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.register(req, res);
  }
);

// Verificar token access (similar a check-access)
router.get("/check-access", authenticateToken, (req, res) => {
  res.json({ success: true, data: { valid: true } });
});

// Verificar token mediante controlador (/verify backward compat)
router.get("/verify", async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const authController = new AuthController(db);
  await authController.verify(req, res);
});

// Logout
router.post("/logout", async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const authController = new AuthController(db);
  await authController.logout(req, res);
});

// Refresh
router.post("/refresh", async (req: any, res: any) => {
  const db = req.app.locals.db as Pool;
  const authController = new AuthController(db);
  await authController.refresh(req, res);
});

// Check refresh token (validez sin rotación)
router.get("/check", async (req: any, res: any) => {
  try {
    const db = req.app.locals.db as Pool;
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res
        .status(401)
        .json({ success: false, error: "No existe el token de refresco" });
      return;
    }

    const payload = verifyRefreshTokenPayload(refreshToken);

    const [rows] = await db.execute(
      "SELECT reto_revoked AS revoked FROM RefreshTokens WHERE reto_token_id = ?",
      [payload.tokenId]
    );
    const tokens = rows as Array<{ revoked: number }>;
    if (tokens.length === 0 || tokens[0].revoked) {
      res
        .status(401)
        .json({ success: false, error: "Token inválido o revocado" });
      return;
    }

    res.json({ success: true, data: { valid: true } });
  } catch (e) {
    res.status(401).json({ success: false, error: "Token inválido" });
  }
});

// Forgot password
router.post(
  "/forgot-password",
  forgotValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.forgotPassword(req, res);
  }
);

// Reset password
router.post(
  "/reset-password",
  resetValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.resetPassword(req, res);
  }
);

// Verify email (GET con query ?token= o POST body.token)
router.get(
  "/verify-email",
  verifyEmailValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.verifyEmail(req, res);
  }
);
router.post(
  "/verify-email",
  verifyEmailValidation,
  validateAndPassToController,
  async (req: any, res: any) => {
    const db = req.app.locals.db as Pool;
    const authController = new AuthController(db);
    await authController.verifyEmail(req, res);
  }
);

export default router;
