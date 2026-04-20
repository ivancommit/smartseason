import { useEffect, useState } from "react"
import { useAuthStore } from "../store/authStore"
import client from "../api/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

export default function Dashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await client.get("/api/v1/dashboard")
        setData(res.data)
      } catch (err) {
        console.error("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <div>Loading dashboard...</div>
  if (!data) return <div>Failed to load dashboard.</div>

  const chartData = [
    { name: "Planted", count: data.by_stage.planted || 0 },
    { name: "Growing", count: data.by_stage.growing || 0 },
    { name: "Ready", count: data.by_stage.ready || 0 },
    { name: "Harvested", count: data.by_stage.harvested || 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {user?.role === "agent" ? "Showing your assigned fields only." : "Overview of all fields."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <p className="text-sm font-medium text-muted-foreground">Total Fields</p>
          <h3 className="text-2xl font-bold mt-2">{data.total_fields}</h3>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <p className="text-sm font-medium text-muted-foreground">Active</p>
          <h3 className="text-2xl font-bold text-green-600 mt-2">{data.by_status.active || 0}</h3>
        </div>
        <div className="rounded-xl border bg-red-50 text-card-foreground shadow p-6 dark:bg-red-950/20 dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">At Risk</p>
          <h3 className="text-2xl font-bold text-red-700 dark:text-red-500 mt-2">{data.by_status.at_risk || 0}</h3>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <h3 className="text-2xl font-bold mt-2">{data.by_status.completed || 0}</h3>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="font-semibold leading-none tracking-tight mb-6">Fields by Stage</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow pt-6 overflow-hidden flex flex-col">
          <h3 className="font-semibold leading-none tracking-tight mb-4 px-6">Recent Updates</h3>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Field</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_updates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No recent updates.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_updates.map((update: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6 font-medium">{update.field_name}</TableCell>
                      <TableCell>{update.agent_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={update.note}>
                        {update.note}
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        <span className="bg-secondary px-2 py-1 rounded-md">{update.stage}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
