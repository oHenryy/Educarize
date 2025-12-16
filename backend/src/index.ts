import app from "./app";
import { config } from "./config/env";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Educarize backend rodando na porta ${PORT}`);
});
