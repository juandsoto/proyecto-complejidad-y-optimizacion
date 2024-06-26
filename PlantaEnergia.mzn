%Sara María Eraso Lasso (201924232)
%Juan Sebastián Estupiñán Cifuentes (201924846)
%Juan David Soto Carmona (201958813)

% Lectura de Datos
int: CN; % capacidad central nuclear
int: CT; % capacidad central termica
int: CH; % capacidad central hidroelectrica
int: m;  % cantidad de clientes
int: n;  % cantidad de días a planificar
int: CPN; %costo de producción de la central nuclear.
int: CPT; %costo de producción de la central térmica.
int: CPH; %costo de producción de la central hidroeléctrica.
float: RM; %porcentaje de requerimiento mínimo
array[1..m] of int: P;  %arreglo que representa el pago de cada cliente s
array[1..m, 1..n] of int: d;  %matriz de demanda diaria
int: RA; % número de dias consecutivos en regimen alto
float: PRA; % minimo porcentaje que se considera como regimen alto

% Variables
array[1..n] of var int: PN; % producción de la central nuclear en un día i
array[1..n] of var int: PT; % producción de la central termica en un día i
array[1..n] of var int: PH; % producción de la central hidroelectrica en un día i
array[1..n] of var bool: regimenAlto; % Arreglo booleano que indica en que dias la central hidroelectrica entra en regimen alto

%Aux
array[1..n] of var int: energia_diaria; % arreglo de la cantidad de energía total diaria(suma de todos los clientes)
array[1..m, 1..n] of var int: d_aux; % matriz auxiliar de la demanda diaria; se modifica si no se satisface la demanda de un día i
array[1..m] of var int: pagos;
array[1..3] of var int: costo_central;
array[1..3] of var int: capacidad_centrales;
var float: RM_aux;
var int: RA_aux;
var float: PRA_aux;


% Restricciones

%No negatividad
constraint assert(CN >= 0, "(CN): La capacidad de la central nuclear debe ser mayor a 0");
constraint assert(CT >= 0, "(CT): La capacidad de la central térmica debe ser mayor a 0");
constraint assert(CH >= 0, "(CH): La capacidad de la central hidroeléctrica debe ser mayor a 0");
constraint assert(m >= 0, "(m): Debe haber por lo menos 1 cliente");
constraint assert(n >= 0, "(n): Debe haber por lo menos 1 dia");
constraint assert(RM >= 0, "(RM): El requerimiento mínimo debe ser un valor entre 0 y 1");
constraint assert(CPN >= 0, "(CPN): El costo de producción de la central nuclear debe ser mayor a 0");
constraint assert(CPT >= 0, "(CPT): El costo de producción de la central térmica debe ser mayor a 0");
constraint assert(CPH >= 0, "(CPH): El costo de producción de la central hidroeléctrica debe ser mayor a 0");
constraint assert(PRA >= 0, "(PRA): El porcentaje de regimen alto debe ser un valor entre 0 y 1");
constraint assert(RA >= 2, "(RA): El numeros de dias consecutivos de regimen alto debe ser mayor a 2");

constraint forall(i in 1..n)(PN[i] >= 0);
constraint forall(i in 1..n)(PT[i] >= 0);
constraint forall(i in 1..n)(PH[i] >= 0);
constraint forall(s in 1..m)(P[s] >= 0);
constraint forall(i in 1..n)(forall(s in 1..m)(d[s,i] >= 0));

%Porcentaje satisfactibilidad

constraint assert(RM <=1, "(RM): El requerimiento mínimo debe ser un valor entre 0 y 1");
constraint assert(PRA <=1, "(PRA): El porcentaje de regimen alto debe ser un valor entre 0 y 1");

%Capacidades

constraint forall(i in 1..n)(PN[i] <= CN);
constraint forall(i in 1..n)(PT[i] <= CT);
constraint forall(i in 1..n)(PH[i] <= CH);

constraint forall(i in 1..n)((PN[i]+PT[i]+PH[i]) = energia_diaria[i]);

%Suplir la demanda diaria

constraint forall(i in 1..n)(forall(s in 1..m)(d_aux[s,i] <= d[s,i]));
  
constraint forall(i in 1..n)(forall(s in 1..m)(d_aux[s,i] >= d[s,i]*RM));
     
constraint forall(i in 1..n)(
  (CN+CT+CH) >= sum(s in 1..m)(d_aux[s,i]) 
);

%Mínimos de energia diarios

constraint forall(i in 1..n)(
  energia_diaria[i] = sum(s in 1..m)(d_aux[s,i])
);

% Regimen alto

constraint forall(i in 1..n)(
  regimenAlto[i] = (PH[i] > CH*PRA)
);

constraint forall(i in 1..n)(
  (i+RA-1 <= n) -> sum(j in i..(i+RA-1))(regimenAlto[j]) < RA
);

% Variables para mostrar en el output

constraint forall(s in 1..m)(pagos[s] = P[s]);
constraint costo_central = [CPN,CPT,CPH];
constraint capacidad_centrales = [CN,CT,CH];
constraint RM_aux = RM;
constraint RA_aux = RA;
constraint PRA_aux = PRA;

% Objetivo

var float: ganancia;
constraint ganancia >= 0;
constraint ganancia = sum(i in 1..n)(
  sum(s in 1..m)(d_aux[s,i]*P[s]) - ((CPN*PN[i])+(CPT*PT[i])+(CPH*PH[i]))
);

solve maximize ganancia;

output ["ganancia = \(ganancia)\n",
        "energia diaria = \(energia_diaria)\n",
        "produccion central nuclear = \(PN)\n",
        "produccion central termica = \(PT)\n",
        "produccion central hidroelectrica = \(PH)\n",
        "pagos por cada cliente = \(P)\n",
        "matriz = \(d_aux)\n"];