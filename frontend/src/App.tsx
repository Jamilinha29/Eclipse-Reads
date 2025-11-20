import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LibraryProvider } from "./contexts/LibraryContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Header from "./components/Header";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Plan from "./pages/Plan";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import SubmitBook from "./pages/SubmitBook";
import MySubmissions from "./pages/MySubmissions";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import BookDetail from "./pages/BookDetail";
import Read from "./pages/Read";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LibraryProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/library" element={<Library />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/plan" element={<Plan />} />
                        <Route path="/submit-book" element={<SubmitBook />} />
                        <Route path="/my-submissions" element={<MySubmissions />} />
                        <Route 
                          path="/admin" 
                          element={
                            <AdminRoute>
                              <AdminPanel />
                            </AdminRoute>
                          } 
                        />
                        <Route path="/book/:id" element={<BookDetail />} />
                        <Route path="/read/:id" element={<Read />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
