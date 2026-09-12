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
import { ComingSoon } from '@/pages/ComingSoon';
import { LoadingPage } from '@/components/ui';
import {
  MessageSquare, FileText, Megaphone, BarChart3, Bot,
  FolderOpen, Plug,
} from 'lucide-react';

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
      case 'conversations': return <ComingSoon title="Conversations" phase={3} icon={MessageSquare} description="A unified inbox for Gmail, WhatsApp, Facebook, Instagram, Jotform, and website enquiries — all in one place." />;
      case 'forms': return <ComingSoon title="Forms" phase={2} icon={FileText} description="Connect Jotform, map questions to CRM fields, and import submissions as leads or enquiries." />;
      case 'campaigns': return <ComingSoon title="Campaigns" phase={5} icon={Megaphone} description="Create dynamic customer segments and draft marketing campaigns with consent enforcement." />;
      case 'analytics': return <ComingSoon title="Analytics" phase={5} icon={BarChart3} description="Advanced analytics: sales trends, conversion rates, customer lifetime value, and AI usage insights." />;
      case 'ai-assistant': return <ComingSoon title="AI Assistant" phase={4} icon={Bot} description="A chatbot that searches and analyses CRM data using natural language, powered by OpenAI, Google Gemini, or Anthropic Claude." />;
      case 'files': return <ComingSoon title="Files" phase={1} icon={FolderOpen} description="Secure file management with customer folders, order folders, previews, and version history." />;
      case 'integrations': return <ComingSoon title="Integrations" phase={2} icon={Plug} description="Connect Google, Jotform, WhatsApp Business, Meta, LinkedIn, TikTok, and X/Twitter through official APIs." />;
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
