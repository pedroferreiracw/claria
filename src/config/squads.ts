import { Bird, Dog, Fish, Worm, type LucideIcon } from 'lucide-react';
import { Squad } from '@/types';

export interface SquadConfig {
  name: Squad;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge: string;
}

export const SQUADS: SquadConfig[] = [
  {
    name: 'Águia',
    icon: Bird,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    name: 'Lobo',
    icon: Dog,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    name: 'Sharks',
    icon: Fish,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    name: 'Serpentes',
    icon: Worm,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
];

export const getSquadConfig = (name: Squad): SquadConfig =>
  SQUADS.find((s) => s.name === name) ?? SQUADS[0];
