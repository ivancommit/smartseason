import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import client from "../api/client"
import { useAuthStore } from "../store/authStore"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"

export function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    planted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    growing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    harvested: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  }
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${styles[stage] || styles.planted}`}>
      {stage}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    at_risk: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  }
  const label = status === "at_risk" ? "At Risk" : status
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${styles[status] || styles.active}`}>
      {label}
    </span>
  )
}

export default function Fields() {
  const { user } = useAuthStore()
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadFields = async () => {
    try {
      const { data } = await client.get("/api/v1/fields")
      setFields(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this field?")) return
    try {
      await client.delete(`/api/v1/fields/${id}`)
      setFields(fields.filter(f => f.id !== id))
    } catch (e) {
      alert("Failed to delete field.")
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  if (loading) return <div>Loading records...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Fields Directory</h1>
        {user?.role === "admin" && (
          <Button asChild>
            <Link to="/fields/new">New Field</Link>
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Crop Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Agent</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium">
                  <Link to={`/fields/${field.id}`} className="text-primary hover:underline">
                    {field.name}
                  </Link>
                </TableCell>
                <TableCell>{field.crop_type}</TableCell>
                <TableCell><StageBadge stage={field.stage} /></TableCell>
                <TableCell><StatusBadge status={field.status} /></TableCell>
                <TableCell>{field.assigned_agent ? field.assigned_agent.name : "Unassigned"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {field.last_update_at 
                    ? formatDistanceToNow(new Date(field.last_update_at), { addSuffix: true })
                    : "No updates yet"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/fields/${field.id}`}>View</Link>
                  </Button>
                  {user?.role === "admin" && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/fields/${field.id}/edit`}>Edit</Link>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(field.id)}>
                        Del
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No fields found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
