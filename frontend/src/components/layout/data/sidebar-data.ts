import {
  LayoutDashboard,
  Leaf,
  Users
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@smartseason.app',
    avatar: '',
  },
  teams: [],
  navGroups: [
    {
      title: 'SmartSeason',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Fields',
          url: '/fields',
          icon: Leaf,
        },
        {
          title: 'Agents',
          url: '/agents',
          icon: Users,
        },
      ],
    },
  ],
}
