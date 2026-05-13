import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Counselling from "./pages/Counselling";
import ResourceHub from "./pages/ResourceHub";
import PeerSupport from "./pages/PeerSupport";
import AdminDashboard from "./pages/AdminDashboard";
import MyWellness from "./pages/MyWellness";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import CounsellorDashboard from "./pages/CounsellorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
const queryClient = new QueryClient();
const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />}/>
          <Route path="/book" element={<ProtectedRoute roles={["user"]}>
                <Counselling />
              </ProtectedRoute>}/>
          <Route path="/counselling" element={<ProtectedRoute roles={["user"]}>
                <Counselling />
              </ProtectedRoute>}/>
          <Route path="/counselling/:counsellorId" element={<ProtectedRoute roles={["user"]}>
                <Counselling />
              </ProtectedRoute>}/>
          <Route path="/resources" element={<ResourceHub />}/>
          <Route path="/peer" element={<ProtectedRoute roles={["user", "admin"]}>
                <PeerSupport />
              </ProtectedRoute>}/>
          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>}/>
          <Route path="/wellness" element={<ProtectedRoute roles={["user", "admin"]}>
                <MyWellness />
              </ProtectedRoute>}/>
          <Route path="/dashboard" element={<ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>}/>
          <Route path="/user" element={<ProtectedRoute roles={["user"]}>
                <UserDashboard />
              </ProtectedRoute>}/>
          <Route path="/counsellor" element={<ProtectedRoute roles={["counsellor"]}>
                <CounsellorDashboard />
              </ProtectedRoute>}/>
          <Route path="/signup" element={<Signup />}/>
          <Route path="/login" element={<Login />}/>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />}/>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
