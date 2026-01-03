import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowDownIcon, ArrowUpIcon, FileText, Receipt, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { getShortVersionString } from "@shared/version";

export default function Dashboard() {
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: documents } = trpc.documents.list.useQuery();
  const { data: entries } = trpc.bookkeeping.list.useQuery();

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!entries) return null;

    const totalIncome = entries
      .filter(e => e.entryType === 'income')
      .reduce((sum, e) => sum + (e.amountGbp || e.amount), 0) / 100;

    const totalExpenses = entries
      .filter(e => e.entryType === 'expense')
      .reduce((sum, e) => sum + (e.amountGbp || e.amount), 0) / 100;

    const netProfit = totalIncome - totalExpenses;

    const byJurisdiction: Record<string, { income: number; expenses: number }> = {};
    entries.forEach(e => {
      if (!byJurisdiction[e.jurisdiction]) {
        byJurisdiction[e.jurisdiction] = { income: 0, expenses: 0 };
      }
      const amount = (e.amountGbp || e.amount) / 100;
      if (e.entryType === 'income') {
        byJurisdiction[e.jurisdiction].income += amount;
      } else {
        byJurisdiction[e.jurisdiction].expenses += amount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      byJurisdiction,
    };
  }, [entries]);

  const pendingDocuments = documents?.filter(d => d.status === 'pending').length || 0;
  const processedDocuments = documents?.filter(d => d.status === 'processed' || d.status === 'verified').length || 0;

  return (
    <div className="space-y-8">
      {/* Version Badge */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Cross-border accounting overview for UK and Netherlands operations
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="font-mono text-xs font-semibold text-primary">
              {getShortVersionString()}
            </span>
          </div>
          <a 
            href="https://github.com/corzogac/ai4water_accounting" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-xs text-muted-foreground hover:text-primary mt-1"
          >
            View on GitHub →
          </a>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold currency">
              £{stats?.totalIncome.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All jurisdictions (GBP equivalent)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold currency">
              £{stats?.totalExpenses.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All jurisdictions (GBP equivalent)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold currency ${stats && stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              £{stats?.netProfit.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Income minus expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingDocuments} pending, {processedDocuments} processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jurisdiction Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {jurisdictions?.map(jurisdiction => {
          const jData = stats?.byJurisdiction[jurisdiction.countryCode];
          if (!jData) return null;

          return (
            <Card key={jurisdiction.id}>
              <CardHeader>
                <CardTitle>{jurisdiction.name}</CardTitle>
                <CardDescription>
                  {jurisdiction.taxAuthorityName} • {jurisdiction.currencyCode}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Income</span>
                  <span className="font-semibold currency text-green-600">
                    {jurisdiction.currencyCode === 'GBP' ? '£' : '€'}
                    {jData.income.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-semibold currency text-red-600">
                    {jurisdiction.currencyCode === 'GBP' ? '£' : '€'}
                    {jData.expenses.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Net</span>
                  <span className={`font-bold currency ${jData.income - jData.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {jurisdiction.currencyCode === 'GBP' ? '£' : '€'}
                    {(jData.income - jData.expenses).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a href="/receipts" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Upload Receipt</div>
                <div className="text-sm text-muted-foreground">Add new expense</div>
              </div>
            </a>
            <a href="/chat" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">AI Tax Assistant</div>
                <div className="text-sm text-muted-foreground">Ask questions</div>
              </div>
            </a>
            <a href="/reports" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Generate Report</div>
                <div className="text-sm text-muted-foreground">Export data</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
