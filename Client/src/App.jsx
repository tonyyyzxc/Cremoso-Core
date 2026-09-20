import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Email:", email, "Password:", password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#13131f]">
      <div className="bg-[#1c1c2b] p-8 rounded-lg w-96">
        <h1 className="text-white text-lg font-semibold text-center mb-6">
          Welcome to Cremoso
        </h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-md bg-[#2a2a3d] text-white placeholder-gray-400 border border-[#3a3a4d] focus:outline-none focus:border-blue-500"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md bg-[#2a2a3d] text-white placeholder-gray-400 border border-[#3a3a4d] focus:outline-none focus:border-blue-500"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>

        <button
          type="button"
          className="w-full mt-3 bg-[#2a2a3d] text-white py-2 rounded-md border border-[#3a3a4d] hover:bg-[#33334a] transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
