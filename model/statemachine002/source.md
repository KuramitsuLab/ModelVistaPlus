
## Mermaid

```
stateDiagram-v2
    direction LR
    [*] --> 停止中 : システム起動
    停止中 --> 駐車中 : エンジン停止
    停止中 --> 走行中 : 発進
    走行中 --> 停止中 : 停車
    走行中 --> 走行中 : 加速/減速
    駐車中 --> 停止中 : エンジン始動
    駐車中 --> [*] : システム終了
```

```
stateDiagram-v2
    direction LR
    [*] --> Stopped : System Start
    Stopped --> Parked : Engine Off
    Stopped --> Driving : Start Driving
    Driving --> Stopped : Stop
    Driving --> Driving : Accelerate/Decelerate
    Parked --> Stopped : Engine On
    Parked --> [*] : System Shutdown
```

## PlantUML

```
@startuml
left to right direction

state "Stopped" as Stopped
state "Parked" as Parked
state "Driving" as Driving

[*] --> Stopped : System Start
Stopped --> Parked : Engine Off
Stopped --> Driving : Start Driving
Driving --> Stopped : Stop
Driving --> Driving : Accelerate/Decelerate
Parked --> Stopped : Engine On
Parked --> [*] : System Shutdown

@enduml
```