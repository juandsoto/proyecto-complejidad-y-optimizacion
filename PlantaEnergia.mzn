% Lectura de Datos
int: CN; % capacidad central nuclear
int: CT; % capacidad central termica
int: CH; % capacidad central hidroelectrica
int: m;  % cantidad de clientes
int: n;  % cantidad de días a planificar
array[1..m, 1..n] of int: dsi;  %matriz de demanda diaria
int: CPN; %costo de producción de la central nuclear.
int: CPT; %costo de producción de la central térmica.
int: CPH; %costo de producción de la central hidroeléctrica.
array[1..m] of float: Ps;  %arreglo que representa el pago de cada cliente s
float: RM; %porcentaje de requerimiento mínimo




% Variables
int: PNi; % producción de la central nuclear en un día i
int: PTi; % producción de la central termica en un día i
int: PHi; % producción de la central hidroelectrica en un día i


% Restricciones

  %Capacidades 
  constraint forall(i in 1..n)(PNi<= CN);
  constraint forall(i in 1..n)(PTi <= CT);
  constraint forall(i in 1..n)(PHi <= CH);
  
  %Porcentaje satisfactibilidad
  constraint (RM <=1);
  
  %Suplir le demanda diaria
   % ! ! ! ! falta implementar el 'si no'
  constraint forall(i in 1..n)(sum (s in 1..m)(dsi[i,s]) <= (CN+CT+CH));
  constraint forall(i in 1..n)(sum (s in 1..m)(dsi[i,s]*RM) <= (CN+CT+CH));

% Objetivo
var int: ganancia;
constraint ganancia = sum(i in 1..n, s in 1..m)(dsi[i,s]*Ps[s]) - ((CPN*PNi)+(CPH* PHi)+(CPT*PTi))