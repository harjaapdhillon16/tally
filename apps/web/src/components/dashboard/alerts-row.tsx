import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Eye } from "lucide-react";
import Link from "next/link";
import type { DashboardDTO } from "@nexus/types/contracts";

interface AlertsRowProps {
  alerts: DashboardDTO['alerts'];
  onAlertClick: (type: 'low_balance' | 'unusual_spend' | 'needs_review') => void;
}

export function AlertsRow({ alerts, onAlertClick }: AlertsRowProps) {
  const hasAlerts = alerts.lowBalance || alerts.unusualSpend || alerts.needsReviewCount > 0;

  if (!hasAlerts) return null;

  return (
    <div className="flex gap-2">
      {alerts.lowBalance && (
        <Link 
          href="/settings/thresholds"
          onClick={() => onAlertClick('low_balance')}
        >
          <Badge variant="destructive" className="cursor-pointer">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Balance Alert
          </Badge>
        </Link>
      )}
      
      {alerts.unusualSpend && (
        <Badge 
          variant="outline" 
          className="border-orange-200 text-orange-700 cursor-pointer"
          onClick={() => onAlertClick('unusual_spend')}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Unusual Spending Pattern
        </Badge>
      )}
      
      {alerts.needsReviewCount > 0 && (
        <Link 
          href="/review"
          onClick={() => onAlertClick('needs_review')}
        >
          <Badge variant="secondary" className="cursor-pointer">
            <Eye className="w-3 h-3 mr-1" />
            {alerts.needsReviewCount} Need Review
          </Badge>
        </Link>
      )}
    </div>
  );
}