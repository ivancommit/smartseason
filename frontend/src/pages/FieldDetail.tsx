import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import client from "../api/client"
import { useAuthStore } from "../store/authStore"
import { Button } from "@/components/ui/button"
import { StageBadge, StatusBadge } from "./Fields"
import { formatDistanceToNow } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const STAGES = ["planted", "growing", "ready", "harvested"]

export default function FieldDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [field, setField] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadField = async () => {
    try {
      const { data } = await client.get(`/api/v1/fields/${id}`)
      setField(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadField()
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (note.length < 10) return alert("Note must be at least 10 chars")
    
    const currentIdx = STAGES.indexOf(field.stage)
    const nextStage = STAGES[currentIdx + 1]

    setSubmitting(true)
    try {
      await client.post(`/api/v1/fields/${id}/updates`, {
        note,
        stage: nextStage
      })
      setNote("")
      loadField()
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to update field.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading field details...</div>
  if (!field) return <div>Field not found.</div>

  const isHarvested = field.stage === "harvested"
  const currentIdx = STAGES.indexOf(field.stage)
  const nextStageName = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-card p-6 rounded-xl border shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{field.name}</h1>
          {user?.role === "admin" && (
            <Button asChild variant="outline">
              <Link to={`/fields/${id}/edit`}>Edit Field</Link>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Crop Type</p>
            <p className="font-medium">{field.crop_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Planting Date</p>
            <p className="font-medium">{field.planting_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{field.location || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assigned Agent</p>
            <p className="font-medium">{field.assigned_agent?.name || "Unassigned"}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <StageBadge stage={field.stage} />
          <StatusBadge status={field.status} />
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border shadow">
        <h3 className="text-lg font-bold mb-4">Update History</h3>
        <div className="space-y-4">
          {field.updates?.length === 0 ? (
            <p className="text-muted-foreground">No updates recorded yet.</p>
          ) : (
            field.updates?.map((u: any) => (
              <div key={u.id} className="border-l-2 border-primary pl-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{u.agent?.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="mb-2">
                  <StageBadge stage={u.stage} />
                </div>
                <p className="text-sm text-foreground">{u.note}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border shadow">
        <h3 className="text-lg font-bold mb-4">Post Update</h3>
        {isHarvested ? (
          <p className="text-muted-foreground">This field has been harvested.</p>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label>Advance to Stage</Label>
              <div className="mt-1">
                <span className="inline-flex px-3 py-1 bg-secondary rounded-md text-sm font-medium capitalize">
                  {nextStageName}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  (You can only advance to the next immediate stage)
                </span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="note">Condition Note</Label>
              <Textarea 
                id="note" 
                placeholder="Describe the current field conditions... (min 10 characters)" 
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs mt-1 text-muted-foreground">{note.length} / 10 min chars</p>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Update"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
