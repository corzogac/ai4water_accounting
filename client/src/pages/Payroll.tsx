import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Calculator, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Payroll() {
  const [employeeName, setEmployeeName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("NL");
  const [grossSalary, setGrossSalary] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [thirtyPercentRuling, setThirtyPercentRuling] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{
    grossSalary: number;
    wageTax: number;
    socialSecurity: number;
    netSalary: number;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: calculations, isLoading } = trpc.payroll.list.useQuery();
  const calculateMutation = trpc.payroll.calculate.useMutation();

  const handleCalculate = async () => {
    if (!employeeName || !grossSalary) {
      toast.error('Please fill in all required fields');
      return;
    }

    const grossAmount = parseFloat(grossSalary);
    if (isNaN(grossAmount) || grossAmount <= 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    setCalculating(true);

    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const calcResult = await calculateMutation.mutateAsync({
        employeeName,
        jurisdiction,
        grossSalary: Math.round(grossAmount * 100), // Convert to cents
        currency,
        thirtyPercentRuling,
        periodStart,
        periodEnd,
      });

      setResult(calcResult);
      toast.success('Payroll calculated successfully');
      utils.payroll.list.invalidate();
    } catch (error) {
      toast.error('Failed to calculate payroll');
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payroll Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Calculate Dutch wage tax, social security, and net salary with 30% ruling support
        </p>
      </div>

      {/* Calculator Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calculate Payroll</CardTitle>
          <CardDescription>
            Enter employee details to calculate taxes and net salary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee Name</Label>
              <Input
                id="employeeName"
                placeholder="John Doe"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger id="jurisdiction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="NL">Netherlands</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grossSalary">Gross Salary</Label>
              <Input
                id="grossSalary"
                type="number"
                placeholder="5000"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {jurisdiction === 'NL' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="thirtyPercent"
                checked={thirtyPercentRuling}
                onCheckedChange={setThirtyPercentRuling}
              />
              <Label htmlFor="thirtyPercent" className="cursor-pointer">
                Apply 30% Ruling (tax-free compensation for expats)
              </Label>
            </div>
          )}

          <Button onClick={handleCalculate} disabled={calculating} className="w-full">
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Payroll
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 p-6 bg-muted rounded-lg space-y-4">
              <h3 className="font-semibold text-lg">Calculation Result</h3>
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gross Salary</span>
                  <span className="font-semibold currency text-lg">
                    {currency === 'GBP' ? '£' : '€'}{result.grossSalary.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>Wage Tax</span>
                  <span className="font-semibold currency">
                    -{currency === 'GBP' ? '£' : '€'}{result.wageTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>Social Security</span>
                  <span className="font-semibold currency">
                    -{currency === 'GBP' ? '£' : '€'}{result.socialSecurity.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-semibold text-lg">Net Salary</span>
                  <span className="font-bold currency text-xl text-green-600">
                    {currency === 'GBP' ? '£' : '€'}{result.netSalary.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation History */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation History</CardTitle>
          <CardDescription>
            {calculations?.length || 0} payroll calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : calculations && calculations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Wage Tax</TableHead>
                    <TableHead>Social Security</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>30% Ruling</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => {
                    const details = calc.calculationDetailsJson ? JSON.parse(calc.calculationDetailsJson) : null;
                    return (
                      <TableRow key={calc.id}>
                        <TableCell className="font-medium">{calc.employeeName}</TableCell>
                        <TableCell>
                          {new Date(calc.periodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>{calc.jurisdiction}</TableCell>
                        <TableCell className="currency">
                          {calc.currency === 'GBP' ? '£' : '€'}
                          {(calc.grossSalary / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="currency text-red-600">
                          {calc.currency === 'GBP' ? '£' : '€'}
                          {((calc.wageTax || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="currency text-red-600">
                          {calc.currency === 'GBP' ? '£' : '€'}
                          {((calc.socialSecurity || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="currency font-semibold text-green-600">
                          {calc.currency === 'GBP' ? '£' : '€'}
                          {((calc.netSalary || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {calc.thirtyPercentRuling ? '✓' : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calculations yet</p>
              <p className="text-sm mt-1">Calculate your first payroll to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
