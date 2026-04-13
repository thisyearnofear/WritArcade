/**
 * Service to derive visual style modifiers from narrative mood
 */
export class MoodModifierService {
  static getMoodModifiers(mood: { tension: number; chaos: number; hope: number }): string {
    const modifiers: string[] = [];

    // Tension: influences lighting and shadows
    if (mood.tension > 5) modifiers.push("high contrast, dramatic chiaroscuro shadows, noir");
    if (mood.tension < -5) modifiers.push("soft focus, gentle atmosphere, clear visibility");

    // Chaos: influences line work and composition
    if (mood.chaos > 5) modifiers.push("chaotic composition, bold distorted lines, expressionist");
    if (mood.chaos < -5) modifiers.push("symmetrical composition, clean lines, calm structure");

    // Hope: influences color palette
    if (mood.hope > 5) modifiers.push("vibrant warm colors, golden hour lighting, hopeful");
    if (mood.hope < -5) modifiers.push("muted cool tones, desaturated colors, somber");

    return modifiers.join(", ");
  }
}
