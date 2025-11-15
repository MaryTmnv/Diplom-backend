export interface OverviewStats {
  totalTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number; // в минутах
  nps: number; // Net Promoter Score (0-100)
  changes: {
    totalTickets: number; // процент изменения
    resolvedTickets: number;
    averageResolutionTime: number;
    nps: number;
  };
}

export interface TicketsByStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface TicketsByCategory {
  category: string;
  title: string;
  count: number;
  percentage: number;
}

export interface TicketsByPriority {
  priority: string;
  count: number;
  percentage: number;
}

export interface OperatorPerformance {
  operator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  resolvedCount: number;
  averageTime: number; // в минутах
  rating: number; // средняя оценка
  activeTickets: number;
}

export interface TopIssue {
  title: string;
  category: string;
  count: number;
}

export interface SLAViolation {
  ticket: {
    id: string;
    number: string;
    title: string;
    client: any;
    operator: any;
  };
  violationTime: number; // на сколько минут превышен SLA
  createdAt: Date;
  resolvedAt: Date;
}

export interface TimeSeriesData {
  date: string;
  count: number;
}
