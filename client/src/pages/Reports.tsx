import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Reports() {
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  const [period, setPeriod] = useState<string>("ytd"); // ytd, q1, q2, q3, q4, custom

  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    
    switch (period) {
      case 'ytd':
        return {
          startDate: new Date(year, 0, 1),
          endDate: now,
        };
      case 'q1':
        return {
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 2, 31),
        };
      case 'q2':
        return {
          startDate: new Date(year, 3, 1),
          endDate: new Date(year, 5, 30),
        };
      case 'q3':
        return {
          startDate: new Date(year, 6, 1),
          endDate: new Date(year, 8, 30),
        };
      case 'q4':
        return {
          startDate: new Date(year, 9, 1),
          endDate: new Date(year, 11, 31),
        };
      default:
        return {
          startDate: new Date(year, 0, 1),
          endDate: now,
        };
    }
  }, [period]);

  const { data: summary, isLoading } = trpc.reports.summary.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    jurisdiction: jurisdiction === 'all' ? undefined : jurisdiction,
  });

  const handleExportCSV = () => {
    if (!summary) return;

    const rows = [
      ['AI4Water Accounting Report'],
      ['Period', `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`],
      ['Jurisdiction', jurisdiction === 'all' ? 'All' : jurisdiction],
      [''],
      ['Summary'],
      ['Total Income', `£${summary.totalIncome.toFixed(2)}`],
      ['Total Expenses', `£${summary.totalExpenses.toFixed(2)}`],
      ['Net Profit', `£${summary.netProfit.toFixed(2)}`],
      [''],
      ['By Jurisdiction'],
      ['Jurisdiction', 'Income', 'Expenses', 'Net'],
    ];

    Object.entries(summary.byJurisdiction).forEach(([jur, data]) => {
      rows.push([
        jur,
        `${(data.income / 100).toFixed(2)}`,
        `${(data.expenses / 100).toFixed(2)}`,
        `${((data.income - data.expenses) / 100).toFixed(2)}`,
      ]);
    });

    rows.push([''], ['By Category'], ['Category', 'Amount']);
    Object.entries(summary.byCategory).forEach(([cat, amount]) => {
      rows.push([cat, `${(amount / 100).toFixed(2)}`]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai4water-report-${dateRange.startDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Generate financial reports and analyze cross-border transactions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Select period and jurisdiction to generate report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="q1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="q2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="q3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="q4">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger id="jurisdiction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  {jurisdictions?.map(j => (
                    <SelectItem key={j.id} value={j.countryCode}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExportCSV} disabled={!summary || isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold currency text-green-600">
                  £{summary.totalIncome.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.transactionCount} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold currency text-red-600">
                  £{summary.totalExpenses.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold currency ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  £{summary.netProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Jurisdiction */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown by Jurisdiction</CardTitle>
              <CardDescription>
                Income and expenses per country
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(summary.byJurisdiction).map(([jur, data]) => {
                  const jurInfo = jurisdictions?.find(j => j.countryCode === jur);
                  const income = data.income / 100;
                  const expenses = data.expenses / 100;
                  const net = income - expenses;

                  return (
                    <div key={jur} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-semibold">{jurInfo?.name || jur}</h3>
                          <p className="text-sm text-muted-foreground">
                            {jurInfo?.currencyCode}
                          </p>
                        </div>
                        <div className={`text-lg font-bold currency ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {jurInfo?.currencyCode === 'GBP' ? '£' : '€'}
                          {net.toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Income:</span>
                          <span className="ml-2 font-semibold currency text-green-600">
                            {jurInfo?.currencyCode === 'GBP' ? '£' : '€'}
                            {income.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expenses:</span>
                          <span className="ml-2 font-semibold currency text-red-600">
                            {jurInfo?.currencyCode === 'GBP' ? '£' : '€'}
                            {expenses.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown by Category</CardTitle>
              <CardDescription>
                Expenses grouped by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center p-3 border rounded">
                      <span className="font-medium">{category}</span>
                      <span className="currency font-semibold">
                        £{(amount / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-2">
              Add some transactions to generate reports
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
