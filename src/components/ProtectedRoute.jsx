import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { loadCurrentUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
const approvedCounsellorStatuses = ["active", "approved"];
const ProtectedRoute = ({ children, roles }) => {
    const dispatch = useAppDispatch();
    const location = useLocation();
    const { token, user, status } = useAppSelector((state) => state.auth);
    useEffect(() => {
        if (token && !user && status !== "loading") {
            void dispatch(loadCurrentUser());
        }
    }, [dispatch, status, token, user]);
    if (!token) {
        return <Navigate to="/login" replace state={{ from: location }}/>;
    }
    if (!user || status === "loading") {
        return (<div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary"/>
          <span>Checking secure access...</span>
        </div>
      </div>);
    }
    if (roles && !roles.includes(user.role)) {
        return (<div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card p-6 max-w-md text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-3"/>
          <h1 className="text-xl font-semibold">Wrong dashboard for this account</h1>
          <p className="text-sm text-foreground/70 mt-2">
            You are signed in as {user.role}. Redirect to your authorized dashboard.
          </p>
          <Navigate to="/dashboard" replace/>
        </div>
      </div>);
    }
    if (roles?.includes("counsellor") && user.role === "counsellor" && !approvedCounsellorStatuses.includes(user.status)) {
        return <Navigate to="/dashboard" replace/>;
    }
    return <>{children}</>;
};
export default ProtectedRoute;
