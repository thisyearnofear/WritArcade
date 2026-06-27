/**
 * Service to derive visual style modifiers from narrative mood and game genre
 */
export class MoodModifierService {
  static getMoodModifiers(mood: { tension: number; chaos: number; hope: number }, genre: string): string {
    const modifiers: string[] = [];
    const lowerGenre = genre.toLowerCase();

    // Genre-specific visual presets
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _getGenreStyle = (tension: string, hope: string) => {
        if (lowerGenre.includes('fantasy')) return { tension: "gothic, eldritch, magical, dangerous", hope: "ethereal, warm, radiant, celestial" };
        if (lowerGenre.includes('noir') || lowerGenre.includes('mystery')) return { tension: "high contrast, dramatic chiaroscuro shadows, gritty noir", hope: "dimly lit, melancholic, reflective" };
        if (lowerGenre.includes('cyberpunk')) return { tension: "neon-lit, rain-slicked, industrial, gritty", hope: "vibrant neon, tech-infused, energetic" };
        return { tension: "dramatic, intense", hope: "bright, clear" };
    };

    const style = _getGenreStyle(lowerGenre, lowerGenre);

    // Tension: influences lighting and shadows
    if (mood.tension > 5) modifiers.push(style.tension);
    if (mood.tension < -5) modifiers.push("serene, soft focus, calm");

    // Chaos: influences line work and composition
    if (mood.chaos > 5) modifiers.push("chaotic composition, distorted, experimental, expressionist");
    if (mood.chaos < -5) modifiers.push("symmetrical composition, clean lines, stable");

    // Hope: influences color palette
    if (mood.hope > 5) modifiers.push(style.hope);
    if (mood.hope < -5) modifiers.push("desaturated, somber, monochromatic");

    return modifiers.join(", ");
  }
}
