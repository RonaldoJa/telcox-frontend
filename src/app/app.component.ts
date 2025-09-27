import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConsumptionDashboardComponent } from "./components/consumption-dashboard/consumption-dashboard.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConsumptionDashboardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'telcox-frontend';
}
