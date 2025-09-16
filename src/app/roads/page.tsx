'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { Direction, Status } from '@prisma/client'
import Link from 'next/link'

// API functions
const fetchRoads = async () => {
  const response = await fetch('/api/roads')
  if (!response.ok) {
    throw new Error('Failed to fetch roads')
  }
  return response.json()
}

const fetchJunctions = async () => {
  const response = await fetch('/api/junctions')
  if (!response.ok) {
    throw new Error('Failed to fetch junctions')
  }
  return response.json()
}

const createRoad = async (data: any) => {
  const response = await fetch('/api/roads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error('Failed to create road')
  }
  return response.json()
}

const updateRoad = async ({ id, ...data }: any) => {
  const response = await fetch(`/api/roads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error('Failed to update road')
  }
  return response.json()
}

const deleteRoad = async (id: string) => {
  const response = await fetch(`/api/roads/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('Failed to delete road')
  }
  return response.json()
}

export default function RoadsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRoad, setEditingRoad] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    direction: '',
    vehicleCount: 0,
    maxCapacity: 50,
    junctionId: ''
  })

  const queryClient = useQueryClient()

  const { data: roads, isLoading, error } = useQuery({
    queryKey: ['roads'],
    queryFn: fetchRoads
  })

  const { data: junctions } = useQuery({
    queryKey: ['junctions'],
    queryFn: fetchJunctions
  })

  const createMutation = useMutation({
    mutationFn: createRoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roads'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success('Road created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create road')
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateRoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roads'] })
      setIsEditDialogOpen(false)
      setEditingRoad(null)
      resetForm()
      toast.success('Road updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update road')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roads'] })
      toast.success('Road deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete road')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      direction: '',
      vehicleCount: 0,
      maxCapacity: 50,
      junctionId: ''
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRoad) {
      updateMutation.mutate({ id: editingRoad.id, ...formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (road: any) => {
    setEditingRoad(road)
    setFormData({
      name: road.name,
      direction: road.direction,
      vehicleCount: road.vehicleCount,
      maxCapacity: road.maxCapacity,
      junctionId: road.junctionId
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (roadId: string) => {
    deleteMutation.mutate(roadId)
  }

  const getDirectionIcon = (direction: Direction) => {
    switch (direction) {
      case 'NORTH':
        return '⬆️'
      case 'SOUTH':
        return '⬇️'
      case 'EAST':
        return '➡️'
      default:
        return '🛣️'
    }
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'RED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'GREEN':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Roads</h1>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Road Management</h1>
            <p className="text-gray-600">Manage roads and their traffic lights</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Road
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Road</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Road Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="direction">Direction</Label>
                <Select value={formData.direction} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORTH">North</SelectItem>
                    <SelectItem value="SOUTH">South</SelectItem>
                    <SelectItem value="EAST">East</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="vehicleCount">Initial Vehicle Count</Label>
                <Input
                  id="vehicleCount"
                  type="number"
                  min="0"
                  value={formData.vehicleCount}
                  onChange={(e) => setFormData({ ...formData, vehicleCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label htmlFor="maxCapacity">Max Capacity</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 50 })}
                />
              </div>
              
              <div>
                <Label htmlFor="junction">Junction</Label>
                <Select value={formData.junctionId} onValueChange={(value) => setFormData({ ...formData, junctionId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select junction" />
                  </SelectTrigger>
                  <SelectContent>
                    {junctions?.map((junction: any) => (
                      <SelectItem key={junction.id} value={junction.id}>
                        {junction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Road'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roads?.map((road: any) => (
          <Card key={road.id} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getDirectionIcon(road.direction)}</span>
                  <span>{road.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(road.trafficLight.status)}>
                    {road.trafficLight.status}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Direction:</span>
                  <div className="font-medium">{road.direction}</div>
                </div>
                <div>
                  <span className="text-gray-600">Vehicles:</span>
                  <div className="font-medium">{road.vehicleCount}/{road.maxCapacity}</div>
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-600">Junction:</span>
                <div className="font-medium">{road.junction.name}</div>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-600">Light Timing:</span>
                <div className="font-medium">
                  R: {road.trafficLight.timing.red}s, 
                  Y: {road.trafficLight.timing.yellow}s, 
                  G: {road.trafficLight.timing.green}s
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Dialog open={isEditDialogOpen && editingRoad?.id === road.id} onOpenChange={(open) => {
                  if (!open) {
                    setIsEditDialogOpen(false)
                    setEditingRoad(null)
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(road)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Road</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Road Name</Label>
                        <Input
                          id="edit-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-direction">Direction</Label>
                        <Select value={formData.direction} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORTH">North</SelectItem>
                            <SelectItem value="SOUTH">South</SelectItem>
                            <SelectItem value="EAST">East</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-vehicleCount">Vehicle Count</Label>
                        <Input
                          id="edit-vehicleCount"
                          type="number"
                          min="0"
                          value={formData.vehicleCount}
                          onChange={(e) => setFormData({ ...formData, vehicleCount: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-maxCapacity">Max Capacity</Label>
                        <Input
                          id="edit-maxCapacity"
                          type="number"
                          min="1"
                          value={formData.maxCapacity}
                          onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 50 })}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? 'Updating...' : 'Update Road'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Road</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{road.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(road.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}