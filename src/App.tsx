import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Login } from '@/pages/Login';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Customers } from '@/pages/Customers';
import { Orders } from '@/pages/Orders';
import { Products } from '@/pages/Products';
import { Payments } from '@/pages/Payments';
import { Tasks } from '@/pages/Tasks';
import { Calendar } from '@/pages/Calendar';
import { Leads } from '@/pages/Leads';
import { Imports } from '@/pages/Imports';
import { Settings } from '@/pages/Settings';
import { UsersPermissions } from '@/pages/UsersPermissions';
import { AuditLog } from '@/pages/AuditLog';
import { Conversations } from '@/pages/Conversations';
import { Forms } from '@/pages/Forms';
import { Files } from '@/pages/Files';
import { Integrations } from '@/pages/Integrations';
import { AiAssistant } from '@/pages/AiAssistant';
import { Campaigns } from '@/pages/Campaigns';
import { Analytics } from '@/pages/Analytics';
import { LoadingPage } from '@/components/ui';


function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) return <LoadingPage />;

  if (!session || !profile) {
    return <Login />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'customers': return <Customers />;
      case 'leads': return <Leads />;
      case 'orders': return <Orders />;
      case 'products': return <Products />;
      case 'payments': return <Payments />;
      case 'tasks': return <Tasks />;
      case 'calendar': return <Calendar />;
      case 'imports': return <Imports />;
      case 'settings': return <Settings />;
      case 'users': return <UsersPermissions />;
      case 'audit': return <AuditLog />;
      case 'conversations': return <Conversations />;
      case 'forms': return <Forms />;
      case 'campaigns': return <Campaigns />;
      case 'analytics': return <Analytics />;
      case 'ai-assistant': return <AiAssistant />;
      case 'files': return <Files />;
      case 'integrations': return <Integrations />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
