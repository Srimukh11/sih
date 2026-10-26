import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import MDBox from "components/MDBox";
import { auth, firebaseConfigured } from "../firebase";

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = form.email.trim();
    const password = form.password.trim();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!firebaseConfigured || !auth) {
      setError("Firebase is not configured. Add the REACT_APP_FIREBASE values to Dashboard/.env.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        localStorage.setItem("faultEyeAuthenticated", "true");
        localStorage.setItem("faultEyeLoggedInUser", user.email || email);
        navigate("/dashboard");
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        localStorage.setItem("faultEyeAuthenticated", "true");
        localStorage.setItem("faultEyeLoggedInUser", user.email || email);
        navigate("/dashboard");
      }
    } catch (err) {
      const firebaseErrors = {
        "auth/email-already-in-use": "This email is already registered. Switch to Sign In.",
        "auth/invalid-credential": "The email or password is incorrect.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again later.",
      };
      setError(firebaseErrors[err?.code] || err?.message || "Unable to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDBox
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eaf2f8 0%, #f8fafc 52%, #dce8f2 100%)",
        px: 2,
      }}
    >
      <Grid container justifyContent="center">
        <Grid item xs={12} sm={8} md={5} lg={4}>
          <Card
            sx={{
              borderRadius: 3,
              p: 4,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#0b4f71",
                  color: "white",
                  boxShadow: "0 10px 30px rgba(11, 79, 113, 0.25)",
                }}
              >
                <LockOutlinedIcon fontSize="large" />
              </Box>
            </Box>

            <Typography variant="h4" align="center" fontWeight={700} color="white" mb={1}>
              FaultEye
            </Typography>
            <Typography variant="subtitle2" align="center" color="text.primary" mb={0.5} fontWeight={600}>
              National Utility Monitoring Portal
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" mb={3}>
              Authorized access for operations and response personnel
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ style: { color: "#475569" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#0f172a",
                      backgroundColor: "#f8fafc",
                      "& fieldset": { borderColor: "#94a3b8" },
                      "&:hover fieldset": { borderColor: "#0b4f71" },
                      "&.Mui-focused fieldset": { borderColor: "#0b4f71" },
                    },
                  }}
                />

                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ style: { color: "#475569" } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#0f172a",
                      backgroundColor: "#f8fafc",
                      "& fieldset": { borderColor: "#94a3b8" },
                      "&:hover fieldset": { borderColor: "#0b4f71" },
                      "&.Mui-focused fieldset": { borderColor: "#0b4f71" },
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    background: "#0b4f71",
                    boxShadow: "0 10px 24px rgba(11, 79, 113, 0.25)",
                    "&:hover": {
                      background: "#083b55",
                    },
                  }}
                >
                  {loading ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Create Account" : "Sign In"}
                </Button>

                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    setIsSignUp((current) => !current);
                    setError("");
                  }}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
                </Button>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </MDBox>
  );
}

export default LoginPage;
