import { ArrowUpRight, DollarSign, Activity, Users } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { OverviewChart } from "@/components/overview-chart"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Placeholder metrics — swap for Supabase queries via createClient() in @/lib/supabase/server
const stats = [
  { title: "Total Revenue", value: "$38,300", change: "+12.4% from last month", icon: DollarSign },
  { title: "Active Users", value: "2,847", change: "+8.1% from last month", icon: Users },
  { title: "Transactions", value: "12,432", change: "+3.2% from last month", icon: Activity },
  { title: "Growth Rate", value: "18.7%", change: "+2.3pt from last month", icon: ArrowUpRight },
]

const recentActivity = [
  { id: "TXN-1042", user: "Alice Kim", amount: "$1,250.00", status: "Completed" },
  { id: "TXN-1041", user: "Brian Park", amount: "$320.00", status: "Pending" },
  { id: "TXN-1040", user: "Chloe Lee", amount: "$4,800.00", status: "Completed" },
  { id: "TXN-1039", user: "Daniel Choi", amount: "$96.50", status: "Failed" },
  { id: "TXN-1038", user: "Emma Jung", amount: "$780.00", status: "Completed" },
]

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-medium">Overview</h1>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
                <CardDescription>Monthly revenue, last 7 months</CardDescription>
              </CardHeader>
              <CardContent>
                <OverviewChart />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.user}</TableCell>
                        <TableCell className="tabular-nums">{row.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "Completed"
                                ? "default"
                                : row.status === "Pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
