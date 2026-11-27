import { LineChart } from "react-native-chart-kit";
import React from "react";
import { Platform, ScrollView, Text, View } from "react-native";

const data = {
  labels: ["01-01", "01-02", "01-03", "01-04", "01-05"],
  datasets: [
    { data: [4, 8, 3, 9, 5], color: (o = 1) => `rgba(34,197,94,${o})`, strokeWidth: 2 },
    { data: [2, 3, 6, 1, 4], color: (o = 1) => `rgba(239,68,68,${o})`, strokeWidth: 2 },
  ],
  legend: ["Approved", "Rejected"],
};

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (o = 1) => `rgba(45,55,72,${o})`,
  labelColor: (o = 1) => `rgba(120,120,120,${o})`,
  propsForDots: { r: "3" },
};

export default function ChartProbe() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontWeight: "700" }}>Platform: {Platform.OS}</Text>
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700" }}>withDots=FALSE (fixed)</Text>
        <LineChart
          data={data}
          width={320}
          height={190}
          chartConfig={chartConfig}
          bezier
          fromZero
          withDots={!Platform.OS.includes("web")}
        />
      </View>
    </ScrollView>
  );
}
